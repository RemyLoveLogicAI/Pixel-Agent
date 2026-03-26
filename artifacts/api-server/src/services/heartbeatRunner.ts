import { AgentPool } from './agentPool';
import { CircuitBreaker } from './circuitBreaker';
import { db, agentsTable, heartbeatAgentRunsTable, heartbeatRunsTable, heartbeatDeadLettersTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../middlewares/error-handler';
import { executeAgentHeartbeat } from './agentExecutor'; // To be implemented

export class HeartbeatRunner {
    private agentPool: AgentPool;
    private circuitBreakers: Map<string, CircuitBreaker>;
    private failureThreshold: number;

    constructor(maxConcurrent = 10, failureThreshold = 3, timeoutMs = 30000) {
        this.agentPool = new AgentPool(maxConcurrent, timeoutMs);
        this.circuitBreakers = new Map<string, CircuitBreaker>();
        this.failureThreshold = failureThreshold;
    }

    private getCircuitBreaker(agentId: string): CircuitBreaker {
        if (!this.circuitBreakers.has(agentId)) {
            this.circuitBreakers.set(agentId, new CircuitBreaker(this.failureThreshold));
        }
        return this.circuitBreakers.get(agentId)!;
    }

    async runHeartbeat(companyId: string, trigger: 'scheduled' | 'manual' | 'event' = 'manual') {
        // Check company-wide circuit breaker (to be implemented in company model)
        // For now, we skip company-wide circuit breaker

        const runId = uuidv4();
        const startTime = new Date();

        // Create heartbeat run record
        const [run] = await db
            .insert(heartbeatRunsTable)
            .values({
                id: runId,
                companyId,
                trigger,
                status: 'running',
                agentsTotal: 0, // will update after fetching agents
                agentsSucceeded: 0,
                agentsFailed: 0,
                totalCostUsd: 0,
                startedAt: startTime,
            })
            .returning();

        // Fetch active agents for the company
        const agents = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.companyId, companyId));

        const activeAgents = agents.filter(
            (a) => a.status !== 'terminated' && a.status !== 'circuit_open'
        );

        // Update the run with total agents count
        await db
            .update(heartbeatRunsTable)
            .set({ agentsTotal: activeAgents.length })
            .where(eq(heartbeatRunsTable.id, runId));

        // Create queued agent run entries
        if (activeAgents.length > 0) {
            await db.insert(heartbeatAgentRunsTable).values(
                activeAgents.map((a) => ({
                    id: uuidv4(),
                    heartbeatRunId: runId,
                    agentId: a.id,
                    status: 'queued' as const,
                }))
            );
        }

        // Execute agent heartbeats with structured concurrency
        const results = await this.agentPool.map(
            activeAgents,
            async (agent) => {
                // Per-agent circuit breaker check
                const cb = this.getCircuitBreaker(agent.id);
                if (cb.isOpen()) {
                    return {
                        agentId: agent.id,
                        status: 'skipped',
                        reason: 'agent_circuit_open',
                    };
                }

                try {
                    // Budget check BEFORE execution
                    if (agent.budgetUsedUsd >= agent.budgetMonthlyUsd) {
                        return {
                            agentId: agent.id,
                            status: 'skipped',
                            reason: 'budget_exhausted',
                        };
                    }

                    const result = await executeAgentHeartbeat(agent, runId);
                    cb.recordSuccess();
                    return {
                        agentId: agent.id,
                        status: 'succeeded',
                        result,
                    };
                } catch (error) {
                    cb.recordFailure();
                    await db.insert(heartbeatDeadLettersTable).values({
                        id: uuidv4(),
                        heartbeatRunId: runId,
                        agentId: agent.id,
                        errorMessage: error instanceof Error ? error.message : String(error),
                        errorStack: error instanceof Error ? error.stack : undefined,
                        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
                    });
                    return {
                        agentId: agent.id,
                        status: 'failed',
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            }
        );

        // Aggregate results and update run
        const succeeded = results.filter((r) => r && r.status === 'succeeded').length;
        const failed = results.filter((r) => r && r.status === 'failed').length;
        const totalCost = results.reduce((sum, r) => sum + (r?.result?.cost_usd ?? 0), 0);

        const endTime = new Date();
        await db
            .update(heartbeatRunsTable)
            .set({
                status: failed > 0 ? 'partial_failure' : 'completed',
                agentsSucceeded: succeeded,
                agentsFailed: failed,
                totalCostUsd: totalCost,
                completedAt: endTime,
            })
            .where(eq(heartbeatRunsTable.id, runId));

        // Update individual agent run records
        for (const result of results) {
            if (!result) continue;
            await db
                .update(heartbeatAgentRunsTable)
                .set({
                    status: result.status as any,
                    decision: result.result?.decision ?? null,
                    costUsd: result.result?.cost_usd ?? 0,
                    latencyMs: result.result?.latency_ms ?? 0,
                    error: result.error ?? null,
                    completedAt: new Date(),
                })
                .where(
                    and(
                        eq(heartbeatAgentRunsTable.heartbeatRunId, runId),
                        eq(heartbeatAgentRunsTable.agentId, result.agentId)
                    )
                );
        }

        const finalStatus = failed > 0 ? 'partial_failure' : 'completed';

        return {
            runId,
            status: finalStatus,
            agentsTotal: activeAgents.length,
            agentsSucceeded: succeeded,
            agentsFailed: failed,
            totalCostUsd: totalCost,
        };
    }
}

// Helper function to run heartbeat for a company (to be used in routes)
export async function triggerCompanyHeartbeat(
    companyId: string,
    trigger: 'scheduled' | 'manual' | 'event' = 'manual'
) {
    const runner = new HeartbeatRunner();
    return runner.runHeartbeat(companyId, trigger);
}