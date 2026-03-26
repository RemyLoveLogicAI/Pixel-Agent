import { AgentPool } from './agentPool.js';
import { CircuitBreaker } from './circuitBreaker.js';
import {
    db,
    agentsTable,
    companiesTable,
    heartbeatAgentRunsTable,
    heartbeatRunsTable,
    heartbeatDeadLettersTable,
} from '@workspace/db';
import { eq, and, lte, or, isNull } from 'drizzle-orm';
import { executeAgentHeartbeat } from './agentExecutor.js';

/** Wrap a promise with a hard timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
        ),
    ]);
}

type AgentRow = typeof agentsTable.$inferSelect;

interface AgentResult {
    agentId: string;
    status: 'succeeded' | 'failed' | 'skipped';
    reason?: string;
    costUsd?: number;
    latencyMs?: number;
    decision?: unknown;
    error?: string;
}

export class HeartbeatRunner {
    private agentPool: AgentPool;
    private circuitBreakers: Map<string, CircuitBreaker>;
    private failureThreshold: number;
    private executionTimeoutMs: number;

    constructor(maxConcurrent = 10, failureThreshold = 3, executionTimeoutMs = 30_000) {
        this.agentPool = new AgentPool(maxConcurrent);
        this.circuitBreakers = new Map();
        this.failureThreshold = failureThreshold;
        this.executionTimeoutMs = executionTimeoutMs;
    }

    private getCircuitBreaker(agentId: string): CircuitBreaker {
        if (!this.circuitBreakers.has(agentId)) {
            this.circuitBreakers.set(agentId, new CircuitBreaker(this.failureThreshold));
        }
        return this.circuitBreakers.get(agentId)!;
    }

    async runHeartbeat(
        companyId: string,
        trigger: 'scheduled' | 'manual' | 'event' = 'manual',
    ) {
        // ── 1. Company-wide circuit breaker check ─────────────────────────────
        const [company] = await db
            .select()
            .from(companiesTable)
            .where(eq(companiesTable.id, companyId));

        if (!company) throw new Error(`Company not found: ${companyId}`);

        if (company.circuitBreaker === 'open') {
            return {
                runId: null,
                status: 'blocked',
                reason: 'company_circuit_open',
                agentsTotal: 0,
                agentsSucceeded: 0,
                agentsFailed: 0,
                totalCostUsd: 0,
            };
        }

        // ── 2. Check company budget ───────────────────────────────────────────
        if (company.budgetUsedUsd >= company.budgetMonthlyUsd) {
            return {
                runId: null,
                status: 'blocked',
                reason: 'company_budget_exhausted',
                agentsTotal: 0,
                agentsSucceeded: 0,
                agentsFailed: 0,
                totalCostUsd: 0,
            };
        }

        const runId = crypto.randomUUID();
        const startedAt = new Date();

        // ── 3. Create the heartbeat run record ────────────────────────────────
        await db.insert(heartbeatRunsTable).values({
            id: runId,
            companyId,
            trigger,
            status: 'running',
            agentsTotal: 0,
            agentsSucceeded: 0,
            agentsFailed: 0,
            totalCostUsd: 0,
            startedAt,
        });

        // ── 4. Fetch agents due for execution ─────────────────────────────────
        // Include agents with no nextHeartbeatAt (never run) or overdue ones.
        const now = new Date();
        const allAgents = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.companyId, companyId));

        const dueAgents = allAgents.filter(
            (a) =>
                a.status !== 'terminated' &&
                a.status !== 'circuit_open' &&
                (!a.nextHeartbeatAt || a.nextHeartbeatAt <= now),
        );

        await db
            .update(heartbeatRunsTable)
            .set({ agentsTotal: dueAgents.length })
            .where(eq(heartbeatRunsTable.id, runId));

        if (dueAgents.length === 0) {
            await db
                .update(heartbeatRunsTable)
                .set({ status: 'completed', completedAt: new Date() })
                .where(eq(heartbeatRunsTable.id, runId));
            return { runId, status: 'completed', agentsTotal: 0, agentsSucceeded: 0, agentsFailed: 0, totalCostUsd: 0 };
        }

        // ── 5. Queue agent run records ────────────────────────────────────────
        await db.insert(heartbeatAgentRunsTable).values(
            dueAgents.map((a) => ({
                id: crypto.randomUUID(),
                heartbeatRunId: runId,
                agentId: a.id,
                status: 'queued' as const,
            })),
        );

        // ── 6. Execute with bounded concurrency ───────────────────────────────
        const results = await this.agentPool.map(
            dueAgents,
            (agent) => this.executeOne(agent, runId, company.budgetMonthlyUsd - company.budgetUsedUsd),
        );

        // ── 7. Persist individual agent run outcomes ──────────────────────────
        for (const result of results) {
            await db
                .update(heartbeatAgentRunsTable)
                .set({
                    status: result.status,
                    decision: result.decision ?? null,
                    costUsd: result.costUsd ?? 0,
                    latencyMs: result.latencyMs ?? 0,
                    error: result.error ?? null,
                    completedAt: new Date(),
                })
                .where(
                    and(
                        eq(heartbeatAgentRunsTable.heartbeatRunId, runId),
                        eq(heartbeatAgentRunsTable.agentId, result.agentId),
                    ),
                );
        }

        // ── 8. Aggregate and close the run ────────────────────────────────────
        const succeeded = results.filter((r) => r.status === 'succeeded').length;
        const failed = results.filter((r) => r.status === 'failed').length;
        const totalCostUsd = results.reduce((s, r) => s + (r.costUsd ?? 0), 0);

        const runStatus = failed > 0 && succeeded === 0
            ? 'failed'
            : failed > 0
                ? 'partial_failure'
                : 'completed';

        await db
            .update(heartbeatRunsTable)
            .set({ status: runStatus, agentsSucceeded: succeeded, agentsFailed: failed, totalCostUsd, completedAt: new Date() })
            .where(eq(heartbeatRunsTable.id, runId));

        // ── 9. Update company spend ───────────────────────────────────────────
        if (totalCostUsd > 0) {
            await db
                .update(companiesTable)
                .set({ budgetUsedUsd: company.budgetUsedUsd + totalCostUsd, updatedAt: new Date() })
                .where(eq(companiesTable.id, companyId));
        }

        return { runId, status: runStatus, agentsTotal: dueAgents.length, agentsSucceeded: succeeded, agentsFailed: failed, totalCostUsd };
    }

    /** Execute a single agent heartbeat with timeout, circuit breaker, and DLQ. */
    private async executeOne(
        agent: AgentRow,
        runId: string,
        companyBudgetRemaining: number,
    ): Promise<AgentResult> {
        const cb = this.getCircuitBreaker(agent.id);

        // Per-agent circuit breaker check (in-memory state)
        if (cb.isOpen()) {
            return { agentId: agent.id, status: 'skipped', reason: 'agent_circuit_open' };
        }

        // Per-agent budget check
        if (agent.budgetUsedUsd >= agent.budgetMonthlyUsd) {
            return { agentId: agent.id, status: 'skipped', reason: 'agent_budget_exhausted' };
        }

        // Company remaining budget check (coarse guard)
        if (companyBudgetRemaining <= 0) {
            return { agentId: agent.id, status: 'skipped', reason: 'company_budget_exhausted' };
        }

        // Mark agent as thinking
        await db
            .update(agentsTable)
            .set({ status: 'thinking', updatedAt: new Date() })
            .where(eq(agentsTable.id, agent.id));

        try {
            const result = await withTimeout(
                executeAgentHeartbeat(agent, runId),
                this.executionTimeoutMs,
                `Agent ${agent.id}`,
            );

            cb.recordSuccess();

            // Update agent: next schedule + spend + status
            const nextHeartbeat = agent.heartbeatIntervalSec
                ? new Date(Date.now() + agent.heartbeatIntervalSec * 1000)
                : null;

            await db
                .update(agentsTable)
                .set({
                    status: 'idle',
                    budgetUsedUsd: agent.budgetUsedUsd + (result.cost_usd ?? 0),
                    nextHeartbeatAt: nextHeartbeat,
                    updatedAt: new Date(),
                })
                .where(eq(agentsTable.id, agent.id));

            return {
                agentId: agent.id,
                status: 'succeeded',
                costUsd: result.cost_usd,
                latencyMs: result.latency_ms,
                decision: result.decision,
            };
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            const errStack = error instanceof Error ? error.stack : undefined;

            cb.recordFailure();

            // Persist circuit state to DB if breaker just opened
            const newStatus = cb.isOpen() ? 'circuit_open' : 'error';
            await db
                .update(agentsTable)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(agentsTable.id, agent.id));

            await this.writeToDLQ(runId, agent.id, errMsg, errStack);

            return { agentId: agent.id, status: 'failed', error: errMsg };
        }
    }

    /** Write a failure to the DLQ, incrementing retryCount if an entry already exists. */
    private async writeToDLQ(
        runId: string,
        agentId: string,
        errorMessage: string,
        errorStack?: string,
    ): Promise<void> {
        // Check for an existing unresolved DLQ entry for this agent
        const [existing] = await db
            .select()
            .from(heartbeatDeadLettersTable)
            .where(
                and(
                    eq(heartbeatDeadLettersTable.agentId, agentId),
                    isNull(heartbeatDeadLettersTable.resolvedAt),
                ),
            )
            .limit(1);

        if (existing) {
            const newRetryCount = existing.retryCount + 1;
            const backoffMs = Math.min(5 * 60 * 1000 * 2 ** existing.retryCount, 4 * 60 * 60 * 1000); // exponential, max 4h
            await db
                .update(heartbeatDeadLettersTable)
                .set({
                    retryCount: newRetryCount,
                    errorMessage,
                    errorStack,
                    nextRetryAt: new Date(Date.now() + backoffMs),
                })
                .where(eq(heartbeatDeadLettersTable.id, existing.id));

            // Mark agent circuit_open once maxRetries is exhausted
            if (newRetryCount >= existing.maxRetries) {
                await db
                    .update(agentsTable)
                    .set({ status: 'circuit_open', updatedAt: new Date() })
                    .where(eq(agentsTable.id, agentId));
            }
        } else {
            await db.insert(heartbeatDeadLettersTable).values({
                id: crypto.randomUUID(),
                heartbeatRunId: runId,
                agentId,
                errorMessage,
                errorStack,
                retryCount: 0,
                maxRetries: 3,
                nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
            });
        }
    }

    /**
     * Retry a specific DLQ entry: re-run the agent, update the entry,
     * and resolve it on success.
     */
    async retryDeadLetter(deadLetterId: string): Promise<{ resolved: boolean; error?: string }> {
        const [entry] = await db
            .select()
            .from(heartbeatDeadLettersTable)
            .where(eq(heartbeatDeadLettersTable.id, deadLetterId));

        if (!entry) throw new Error('Dead-letter entry not found');
        if (entry.resolvedAt) throw new Error('Dead-letter entry already resolved');

        const [agent] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, entry.agentId));

        if (!agent) throw new Error('Agent not found');

        // Re-open the circuit if it was forcibly closed for this retry
        const cb = this.getCircuitBreaker(agent.id);

        try {
            const result = await withTimeout(
                executeAgentHeartbeat(agent, entry.heartbeatRunId),
                this.executionTimeoutMs,
                `Agent ${agent.id} (DLQ retry)`,
            );

            cb.recordSuccess();

            await db
                .update(agentsTable)
                .set({
                    status: 'idle',
                    budgetUsedUsd: agent.budgetUsedUsd + (result.cost_usd ?? 0),
                    nextHeartbeatAt: agent.heartbeatIntervalSec
                        ? new Date(Date.now() + agent.heartbeatIntervalSec * 1000)
                        : null,
                    updatedAt: new Date(),
                })
                .where(eq(agentsTable.id, agent.id));

            await db
                .update(heartbeatDeadLettersTable)
                .set({ resolvedAt: new Date() })
                .where(eq(heartbeatDeadLettersTable.id, deadLetterId));

            return { resolved: true };
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            cb.recordFailure();

            const newRetry = entry.retryCount + 1;
            const backoffMs = Math.min(5 * 60 * 1000 * 2 ** entry.retryCount, 4 * 60 * 60 * 1000);

            await db
                .update(heartbeatDeadLettersTable)
                .set({
                    retryCount: newRetry,
                    errorMessage: errMsg,
                    nextRetryAt: new Date(Date.now() + backoffMs),
                })
                .where(eq(heartbeatDeadLettersTable.id, deadLetterId));

            if (newRetry >= entry.maxRetries) {
                await db
                    .update(agentsTable)
                    .set({ status: 'circuit_open', updatedAt: new Date() })
                    .where(eq(agentsTable.id, agent.id));
            }

            return { resolved: false, error: errMsg };
        }
    }
}

export const heartbeatRunner = new HeartbeatRunner();

/** Convenience wrapper for use in route handlers. */
export async function triggerCompanyHeartbeat(
    companyId: string,
    trigger: 'scheduled' | 'manual' | 'event' = 'manual',
) {
    return heartbeatRunner.runHeartbeat(companyId, trigger);
}
