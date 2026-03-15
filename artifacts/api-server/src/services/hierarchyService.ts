import { db, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Agent = typeof agentsTable.$inferSelect;

export class HierarchyService {
    /**
     * Walk up the reporting chain from agentId to the root (CEO).
     * Returns agents ordered from the given agent up to the root.
     * Guards against cycles.
     */
    async getReportingChain(agentId: string): Promise<Agent[]> {
        const chain: Agent[] = [];
        let currentId: string | null = agentId;
        const visited = new Set<string>();

        while (currentId) {
            if (visited.has(currentId)) break; // cycle guard
            visited.add(currentId);

            const [agent] = await db
                .select()
                .from(agentsTable)
                .where(eq(agentsTable.id, currentId));
            if (!agent) break;

            chain.push(agent);
            currentId = agent.managerId;
        }

        return chain;
    }

    /**
     * Return all direct reports for a given agent.
     */
    async getDirectReports(agentId: string): Promise<Agent[]> {
        return db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.managerId, agentId));
    }

    /**
     * True if subordinateId's managerId === managerId.
     */
    async isDirectReport(managerId: string, subordinateId: string): Promise<boolean> {
        const [agent] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, subordinateId));
        return agent?.managerId === managerId;
    }

    /**
     * Validate that fromAgent can delegate the given scopes to toAgent.
     *
     * Rules:
     *  1. toAgent must be a direct report of fromAgent.
     *  2. toAgent.level must be numerically greater (lower in hierarchy).
     *  3. fromAgent's delegationDepth must not exceed its delegationLimit.
     *  4. requestedScopes must be a subset of fromScopes.
     */
    async validateDelegation(
        fromAgentId: string,
        toAgentId: string,
        requestedScopes: string[],
        fromScopes: string[],
    ): Promise<{ valid: boolean; reason?: string }> {
        const [from, to] = await Promise.all([
            db.select().from(agentsTable).where(eq(agentsTable.id, fromAgentId)).then(r => r[0]),
            db.select().from(agentsTable).where(eq(agentsTable.id, toAgentId)).then(r => r[0]),
        ]);

        if (!from) return { valid: false, reason: "Delegating agent not found" };
        if (!to) return { valid: false, reason: "Target agent not found" };
        if (from.status === "terminated") return { valid: false, reason: "Delegating agent is terminated" };
        if (to.status === "terminated") return { valid: false, reason: "Target agent is terminated" };

        // Rule 1: direct report only
        if (to.managerId !== fromAgentId) {
            return { valid: false, reason: "Can only delegate to direct reports" };
        }

        // Rule 2: target must be lower in hierarchy (higher level number)
        if (to.level <= from.level) {
            return { valid: false, reason: "Cannot delegate to same or higher level agent" };
        }

        // Rule 3: delegation depth
        if (from.delegationDepth >= from.delegationLimit) {
            return {
                valid: false,
                reason: `Delegation depth limit reached (${from.delegationLimit})`,
            };
        }

        // Rule 4: scope subset check
        const unauthorisedScopes = requestedScopes.filter(
            requested => !fromScopes.some(
                owned => requested === owned || requested.startsWith(owned + ".")
            )
        );
        if (unauthorisedScopes.length > 0) {
            return {
                valid: false,
                reason: `Cannot delegate scopes not owned: ${unauthorisedScopes.join(", ")}`,
            };
        }

        return { valid: true };
    }

    /**
     * Validate that fromAgent can escalate to toAgent.
     * Escalation is only allowed to the direct manager (fromAgent.managerId === toAgentId).
     */
    async validateEscalation(
        fromAgentId: string,
        toAgentId: string,
    ): Promise<{ valid: boolean; reason?: string }> {
        const [from] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, fromAgentId));

        if (!from) return { valid: false, reason: "Agent not found" };
        if (!from.managerId) return { valid: false, reason: "Agent has no manager to escalate to" };
        if (from.managerId !== toAgentId) {
            return { valid: false, reason: "Can only escalate to direct manager" };
        }

        return { valid: true };
    }
}

export const hierarchyService = new HierarchyService();
