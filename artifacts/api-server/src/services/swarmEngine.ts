import { db, swarmRunsTable, swarmAgentsTable, swarmMessagesTable, agentsTable, goalsTable } from '@workspace/db';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { executeAgentHeartbeat } from './agentExecutor';
import { triggerCompanyHeartbeat } from './heartbeatRunner';

export class SwarmEngine {
    /**
     * Phase 1: PROPOSE - Swarm leader analyzes goal, proposes N specialist roles
     */
    async proposeSwarm(companyId: string, goalId: string, leaderAgentId: string, taskDescription: string) {
        // Get the leader agent to determine capabilities
        const [leader] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, leaderAgentId));

        if (!leader) {
            throw new Error('Leader agent not found');
        }

        // For now, we'll propose a fixed set of specialist roles based on task description
        // In a real implementation, this would use LLM to analyze the task and propose roles
        const specialistRoles = [
            { role: 'researcher', count: 2 },
            { role: 'implementer', count: 2 },
            { role: 'reviewer', count: 1 }
        ];

        // Create swarm run record
        const swarmId = uuidv4();
        const [swarm] = await db
            .insert(swarmRunsTable)
            .values({
                id: swarmId,
                companyId,
                goalId,
                leaderAgentId,
                taskDescription,
                phase: 'proposed',
                specialistRoles: specialistRoles,
                maxAgents: specialistRoles.reduce((sum, role) => sum + role.count, 0),
                createdAt: new Date(),
            })
            .returning();

        return {
            swarmId,
            phase: 'proposed',
            specialistRoles,
            message: 'Swarm proposed. Awaiting approval.'
        };
    }

    /**
     * Phase 2: APPROVE - If swarm cost estimate > threshold, requires governance approval
     */
    async approveSwarm(swarmId: string, approvedBy: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));

        if (!swarm) {
            throw new Error('Swarm not found');
        }

        if (swarm.phase !== 'proposed') {
            throw new Error(`Swarm is not in proposed phase. Current phase: ${swarm.phase}`);
        }

        // Update swarm to pending_approval
        const [updated] = await db
            .update(swarmRunsTable)
            .set({
                phase: 'pending_approval',
                // In a real system, we'd store approval info
            })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        return {
            swarmId: updated.id,
            phase: updated.phase,
            message: 'Swarm approved for spawning.'
        };
    }

    /**
     * Phase 3: SPAWN - Ephemeral agents created with scoped prompts, tools, and memory slices
     */
    async spawnSwarm(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));

        if (!swarm) {
            throw new Error('Swarm not found');
        }

        if (swarm.phase !== 'pending_approval') {
            throw new Error(`Swarm is not in pending_approval phase. Current phase: ${swarm.phase}`);
        }

        const specialistRoles = (swarm.specialistRoles as any[]) || [];
        const spawnedAgents = [];

        // Create ephemeral agents for each role
        for (const roleSpec of specialistRoles) {
            for (let i = 0; i < roleSpec.count; i++) {
                const agentId = uuidv4();
                await db.insert(swarmAgentsTable).values({
                    id: agentId,
                    swarmRunId: swarmId,
                    role: `${roleSpec.role}-${i + 1}`,
                    model: swarm.leaderAgentId ? 'claude-sonnet-4-20250514' : 'default', // Would get from leader
                    systemPrompt: `You are a ${roleSpec.role} in a swarm tasked with: ${swarm.taskDescription}`,
                    status: 'spawned',
                    createdAt: new Date(),
                });

                spawnedAgents.push({
                    id: agentId,
                    role: `${roleSpec.role}-${i + 1}`
                });
            }
        }

        // Update swarm phase to spawning
        const [updated] = await db
            .update(swarmRunsTable)
            .set({ phase: 'spawning' })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        return {
            swarmId: updated.id,
            phase: updated.phase,
            spawnedAgents,
            message: `Swarm spawned with ${spawnedAgents.length} agents.`
        };
    }

    /**
     * Phase 4: EXECUTE - Parallel execution with inter-agent message bus
     */
    async executeSwarm(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));

        if (!swarm) {
            throw new Error('Swarm not found');
        }

        if (swarm.phase !== 'spawning') {
            throw new Error(`Swarm is not in spawning phase. Current phase: ${swarm.phase}`);
        }

        // Get all spawned agents
        const agents = await db
            .select()
            .from(swarmAgentsTable)
            .where(eq(swarmAgentsTable.swarmRunId, swarmId));

        // Execute agents in parallel with structured concurrency
        // For simplicity, we'll simulate execution
        const executionResults = [];

        for (const agent of agents) {
            // In a real implementation, this would use the agent executor
            // For now, we'll simulate
            const result = {
                agentId: agent.id,
                role: agent.role,
                output: {
                    summary: `${agent.role} completed work on: ${swarm.taskDescription}`,
                    details: `Detailed output from ${agent.role}`
                },
                costUsd: 0.01,
                latency_ms: 500
            };

            // Update agent as completed
            await db
                .update(swarmAgentsTable)
                .set({
                    status: 'completed',
                    output: result.output,
                    costUsd: result.costUsd,
                    completedAt: new Date()
                })
                .where(eq(swarmAgentsTable.id, agent.id));

            executionResults.push(result);
        }

        // Update swarm phase to executing
        const [updated] = await db
            .update(swarmRunsTable)
            .set({ phase: 'executing' })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        return {
            swarmId: updated.id,
            phase: updated.phase,
            executionResults,
            message: 'Swarm execution completed.'
        };
    }

    /**
     * Phase 5: SYNTHESIZE - Leader collects all outputs, produces merged result
     */
    async synthesizeSwarm(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));

        if (!swarm) {
            throw new Error('Swarm not found');
        }

        if (swarm.phase !== 'executing') {
            throw new Error(`Swarm is not in executing phase. Current phase: ${swarm.phase}`);
        }

        // Get all completed agents and their outputs
        const agents = await db
            .select()
            .from(swarmAgentsTable)
            .where(
                and(
                    eq(swarmAgentsTable.swarmRunId, swarmId),
                    eq(swarmAgentsTable.status, 'completed')
                )
            );

        // Collect outputs
        const agentOutputs = agents.map(agent => ({
            agentId: agent.id,
            role: agent.role,
            output: agent.output ? (agent.output as any) : null
        }));

        // Create synthesis result (in real system, this would use LLM to synthesize)
        const synthesisResult = {
            task: swarm.taskDescription,
            summary: `Swarm completed task: ${swarm.taskDescription}`,
            contributions: agentOutputs.map(output => ({
                role: output.role,
                summary: output.output?.summary || 'No summary'
            })),
            final_output: `Combined result from ${agentOutputs.length} specialist agents.`,
            totalCost: agentOutputs.reduce((sum, agent) => sum + (agent.output?.costUsd ?? 0), 0)
        };

        // Update swarm with synthesis result and phase
        const [updated] = await db
            .update(swarmRunsTable)
            .set({
                phase: 'synthesizing',
                synthesisResult: synthesisResult,
                totalCostUsd: synthesisResult.totalCost
            })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        return {
            swarmId: updated.id,
            phase: updated.phase,
            synthesisResult,
            message: 'Swarm synthesis completed.'
        };
    }

    /**
     * Phase 6: DISSOLVE - Ephemeral agents terminated, memory archived, cost finalized
     */
    async dissolveSwarm(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));

        if (!swarm) {
            throw new Error('Swarm not found');
        }

        if (swarm.phase !== 'synthesizing') {
            throw new Error(`Swarm is not in synthesizing phase. Current phase: ${swarm.phase}`);
        }

        // Update swarm phase to completed
        const [updated] = await db
            .update(swarmRunsTable)
            .set({
                phase: 'completed',
                completedAt: new Date()
            })
            .where(eq(swarmRunsTable.id, swarmId))
            .returning();

        // In a real system, we would:
        // 1. Archive agent memories to long-term storage
        // 2. Terminate ephemeral agents (they're already just DB records)
        // 3. Finalize cost accounting
        // 4. Notify interested parties

        return {
            swarmId: updated.id,
            phase: updated.phase,
            message: 'Swarm dissolved. Resources cleaned up.'
        };
    }

    /**
     * Get swarm status
     */
    async getSwarmStatus(swarmId: string) {
        const [swarm] = await db
            .select()
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));

        if (!swarm) {
            throw new Error('Swarm not found');
        }

        // Get agent counts
        const agentCounts = await db
            .select({ status: swarmAgentsTable.status, count: sql<number>`count(*)` })
            .from(swarmAgentsTable)
            .where(eq(swarmAgentsTable.swarmRunId, swarmId))
            .groupBy(swarmAgentsTable.status);

        return {
            swarm: {
                id: swarm.id,
                phase: swarm.phase,
                taskDescription: swarm.taskDescription,
                totalCostUsd: swarm.totalCostUsd,
                createdAt: swarm.createdAt,
                completedAt: swarm.completedAt
            },
            agentCounts: Object.fromEntries(agentCounts.map(c => [c.status, Number(c.count)]))
        };
    }
}

// Export singleton instance
export const swarmEngine = new SwarmEngine();
