import {
    db,
    swarmRunsTable,
    swarmAgentsTable,
    swarmMessagesTable,
    agentsTable,
    companiesTable,
    memoryEntriesTable,
    governanceRequestsTable,
} from '@workspace/db';
import { eq, and, sql } from 'drizzle-orm';
import { AgentPool } from './agentPool.js';
import { synthesisService } from './synthesisService.js';
import { swarmMessageBus } from './swarmMessageBus.js';
import { broadcastEvent } from '../routes/events.js';

type SwarmRow = typeof swarmRunsTable.$inferSelect;
type SwarmAgentRow = typeof swarmAgentsTable.$inferSelect;

/** Cost per swarm agent (stub — replace with real estimator). */
const COST_PER_AGENT_USD = 0.05;
/** If estimated cost exceeds this fraction of leader's monthly budget, require governance approval. */
const APPROVAL_COST_THRESHOLD_USD = 1.0;

const TERMINAL_PHASES = new Set(['completed', 'failed', 'dissolved', 'cancelled']);

function assertPhase(swarm: SwarmRow, expected: SwarmRow['phase']): void {
    if (swarm.phase !== expected) {
        throw new Error(`Expected swarm phase "${expected}", got "${swarm.phase}"`);
    }
}

function broadcastSwarmEvent(companyId: string, swarmId: string, phase: string, extra?: unknown) {
    broadcastEvent(companyId, {
        type: 'swarm.phase_changed',
        data: { swarmId, phase, ...(extra as object ?? {}) },
    });
}

export class SwarmEngine {
    private pool = new AgentPool(10);

    // ── Phase 1: PROPOSE ──────────────────────────────────────────────────────

    async proposeSwarm(
        companyId: string,
        goalId: string | null,
        leaderAgentId: string,
        taskDescription: string,
    ) {
        const [leader] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, leaderAgentId));
        if (!leader) throw new Error('Leader agent not found');

        // Fixed specialist role proposal (LLM-driven in production)
        const specialistRoles = [
            { role: 'researcher', count: 2 },
            { role: 'implementer', count: 2 },
            { role: 'reviewer', count: 1 },
        ];
        const totalAgents = specialistRoles.reduce((s, r) => s + r.count, 0);
        const estimatedCostUsd = totalAgents * COST_PER_AGENT_USD;

        const needsApproval = estimatedCostUsd >= APPROVAL_COST_THRESHOLD_USD;

        const swarmId = crypto.randomUUID();
        const [swarm] = await db
            .insert(swarmRunsTable)
            .values({
                id: swarmId,
                companyId,
                goalId: goalId ?? null,
                leaderAgentId,
                taskDescription,
                phase: needsApproval ? 'proposed' : 'pending_approval',
                specialistRoles,
                maxAgents: totalAgents,
                createdAt: new Date(),
            })
            .returning();

        broadcastSwarmEvent(companyId, swarmId, swarm.phase, { estimatedCostUsd, needsApproval });

        if (needsApproval) {
            // Create governance request — swarm will stay in `proposed` until approved
            await db.insert(governanceRequestsTable).values({
                id: crypto.randomUUID(),
                companyId,
                requestingAgentId: leaderAgentId,
                requestType: 'swarm_approval',
                description: `Approve swarm for: ${taskDescription}`,
                metadata: { swarmId, estimatedCostUsd },
                status: 'pending',
                ttlSeconds: 3600,
                expiresAt: new Date(Date.now() + 3600 * 1000) as any,
            });
        }

        return { swarmId, phase: swarm.phase, estimatedCostUsd, needsApproval };
    }

    // ── Phase 2: APPROVE ──────────────────────────────────────────────────────

    async approveSwarm(swarmId: string, approvedBy = 'human') {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));
        if (!swarm) throw new Error('Swarm not found');
        assertPhase(swarm, 'proposed');

        const [updated] = await db
            .update(swarmRunsTable)
            .set({ phase: 'pending_approval' })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        broadcastSwarmEvent(swarm.companyId, swarmId, 'pending_approval', { approvedBy });

        return { swarmId, phase: updated.phase, approvedBy };
    }

    // ── Auto-run: advance through all phases after approval ───────────────────

    /**
     * Drive the full swarm lifecycle from `pending_approval` to `completed`.
     * Runs async — callers should return 202 and let this run in the background.
     */
    async runSwarm(swarmId: string): Promise<void> {
        try {
            await this.spawnSwarm(swarmId);
            await this.executeSwarm(swarmId);
            await this.synthesizeSwarm(swarmId);
            await this.dissolveSwarm(swarmId);
        } catch (err) {
            await this.failSwarm(swarmId, err instanceof Error ? err.message : String(err));
        }
    }

    // ── Phase 3: SPAWN ────────────────────────────────────────────────────────

    async spawnSwarm(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));
        if (!swarm) throw new Error('Swarm not found');
        assertPhase(swarm, 'pending_approval');

        const specialistRoles = (swarm.specialistRoles as Array<{ role: string; count: number }>) ?? [];

        // Spawn agents in parallel
        const agentSpecs = specialistRoles.flatMap(({ role, count }) =>
            Array.from({ length: count }, (_, i) => ({
                id: crypto.randomUUID(),
                role: `${role}-${i + 1}`,
            })),
        );

        await this.pool.map(agentSpecs, async ({ id, role }) => {
            await db.insert(swarmAgentsTable).values({
                id,
                swarmRunId: swarmId,
                role,
                model: 'claude-sonnet-4-6',
                systemPrompt: `You are a ${role} in a swarm tasked with: ${swarm.taskDescription}`,
                status: 'spawned',
                createdAt: new Date(),
            });
            return id;
        });

        const [updated] = await db
            .update(swarmRunsTable)
            .set({ phase: 'spawning' })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        broadcastSwarmEvent(swarm.companyId, swarmId, 'spawning', { agentCount: agentSpecs.length });

        return { swarmId, phase: updated.phase, agentCount: agentSpecs.length };
    }

    // ── Phase 4: EXECUTE ──────────────────────────────────────────────────────

    async executeSwarm(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));
        if (!swarm) throw new Error('Swarm not found');
        assertPhase(swarm, 'spawning');

        await db
            .update(swarmRunsTable)
            .set({ phase: 'executing' })
            .where(eq(swarmRunsTable.id, swarmId));

        broadcastSwarmEvent(swarm.companyId, swarmId, 'executing');

        const agents = await db
            .select()
            .from(swarmAgentsTable)
            .where(eq(swarmAgentsTable.swarmRunId, swarmId));

        // Execute all agents concurrently
        const timeoutMs = (swarm.timeoutSec ?? 300) * 1000;
        await this.pool.map(agents, (agent) =>
            this.executeSwarmAgent(agent, swarm, timeoutMs),
        );

        const [updated] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId))
            .then(r => r);

        return { swarmId, phase: 'executing', agentCount: agents.length };
    }

    private async executeSwarmAgent(
        agent: SwarmAgentRow,
        swarm: SwarmRow,
        timeoutMs: number,
    ): Promise<void> {
        await db
            .update(swarmAgentsTable)
            .set({ status: 'executing' })
            .where(eq(swarmAgentsTable.id, agent.id));

        try {
            // Stub execution — real LLM call goes here
            const output = {
                summary: `${agent.role} completed work on: ${swarm.taskDescription}`,
                details: `Detailed output from ${agent.role}`,
            };
            const costUsd = COST_PER_AGENT_USD;

            // Publish intermediate finding to message bus
            await swarmMessageBus.publish(
                swarm.id,
                agent.id,
                'finding',
                { role: agent.role, summary: output.summary },
            );

            await db
                .update(swarmAgentsTable)
                .set({ status: 'completed', output, costUsd, completedAt: new Date() })
                .where(eq(swarmAgentsTable.id, agent.id));
        } catch (err) {
            await db
                .update(swarmAgentsTable)
                .set({ status: 'failed', completedAt: new Date() })
                .where(eq(swarmAgentsTable.id, agent.id));
        }
    }

    // ── Phase 5: SYNTHESIZE ───────────────────────────────────────────────────

    async synthesizeSwarm(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));
        if (!swarm) throw new Error('Swarm not found');
        assertPhase(swarm, 'executing');

        const synthesisResult = await synthesisService.synthesize(swarmId, swarm.leaderAgentId ?? '');

        const [updated] = await db
            .update(swarmRunsTable)
            .set({
                phase: 'synthesizing',
                synthesisResult: synthesisResult as any,
                totalCostUsd: synthesisResult.totalCostUsd,
            })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        broadcastSwarmEvent(swarm.companyId, swarmId, 'synthesizing', {
            violationsFound: synthesisResult.violationsFound,
            totalCostUsd: synthesisResult.totalCostUsd,
        });

        return { swarmId, phase: updated.phase, synthesisResult };
    }

    // ── Phase 6: DISSOLVE ─────────────────────────────────────────────────────

    async dissolveSwarm(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));
        if (!swarm) throw new Error('Swarm not found');
        assertPhase(swarm, 'synthesizing');

        // Archive synthesis result to company memory
        if (swarm.synthesisResult && swarm.leaderAgentId) {
            await db.insert(memoryEntriesTable).values({
                id: crypto.randomUUID(),
                agentId: swarm.leaderAgentId,
                key: `swarm:${swarmId}:synthesis`,
                value: swarm.synthesisResult as any,
                category: 'swarm_output',
                createdAt: new Date(),
            });
        }

        const [updated] = await db
            .update(swarmRunsTable)
            .set({ phase: 'completed', completedAt: new Date() })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        broadcastSwarmEvent(swarm.companyId, swarmId, 'completed', {
            totalCostUsd: swarm.totalCostUsd,
        });

        return { swarmId, phase: updated.phase };
    }

    // ── Fail ──────────────────────────────────────────────────────────────────

    async failSwarm(swarmId: string, reason: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));
        if (!swarm || TERMINAL_PHASES.has(swarm.phase)) return;

        await db
            .update(swarmRunsTable)
            .set({ phase: 'failed', completedAt: new Date() })
            .where(eq(swarmRunsTable.id, swarmId));

        broadcastSwarmEvent(swarm.companyId, swarmId, 'failed', { reason });
    }

    // ── Status ────────────────────────────────────────────────────────────────

    async getSwarmStatus(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));
        if (!swarm) throw new Error('Swarm not found');

        const agentCounts = await db
            .select({ status: swarmAgentsTable.status, count: sql<number>`count(*)` })
            .from(swarmAgentsTable)
            .where(eq(swarmAgentsTable.swarmRunId, swarmId))
            .groupBy(swarmAgentsTable.status);

        const messageCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(swarmMessagesTable)
            .where(eq(swarmMessagesTable.swarmRunId, swarmId));

        return {
            swarm,
            agentCounts: Object.fromEntries(agentCounts.map(c => [c.status, Number(c.count)])),
            messageCount: Number(messageCount[0]?.count ?? 0),
        };
    }
}

export const swarmEngine = new SwarmEngine();
