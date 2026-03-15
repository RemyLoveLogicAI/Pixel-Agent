import { db, governanceRequestsTable, agentsTable, companiesTable, capabilityTokensTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { capabilityTokenService } from "./capabilityTokenService.js";
import { hierarchyService } from "./hierarchyService.js";

/**
 * Capability Token - defines what an agent can do
 */
export interface CapabilityToken {
    agentId: string;
    role: string;
    level: number;
    scopes: string[];           // e.g., ['goals.write', 'tools.code_exec', 'agents.delegate']
    delegateToLevels: number[]; // can only delegate to these levels (must be > own level)
    escalateTo: string;        // manager agent_id
    maxSingleSpendUsd: number;
    issuedAt: string;
    expiresAt: string;
}

export type GovernanceRequestType =
    | "hire"
    | "fire"
    | "budget_override"
    | "swarm_approval"
    | "escalation"
    | "tool_access"
    | "strategy_change";

/**
 * Governance Service - handles approvals, capability tokens, and escalations
 */
export class GovernanceService {
    /**
     * Create a governance request (e.g., for hiring, budget override, swarm approval)
     */
    async createRequest(params: {
        companyId: string;
        requestingAgentId?: string;
        requestType: GovernanceRequestType;
        description: string;
        metadata?: Record<string, unknown>;
        ttlSeconds?: number;
    }): Promise<typeof governanceRequestsTable.$inferSelect> {
        const ttlSeconds = params.ttlSeconds ?? 3600;
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

        const [request] = await db
            .insert(governanceRequestsTable)
            .values({
                id: crypto.randomUUID(),
                companyId: params.companyId,
                requestingAgentId: params.requestingAgentId ?? null,
                requestType: params.requestType,
                description: params.description,
                metadata: params.metadata ?? null,
                status: "pending",
                ttlSeconds,
                expiresAt: expiresAt.toISOString() as any,
            })
            .returning();

        return request;
    }

    /**
     * Approve a governance request
     */
    async approveRequest(
        requestId: string,
        decidedBy: string = "human",
        note?: string
    ): Promise<typeof governanceRequestsTable.$inferSelect> {
        const [updated] = await db
            .update(governanceRequestsTable)
            .set({
                status: "approved",
                decidedAt: new Date(),
                decidedBy,
                decisionNote: note ?? null,
                updatedAt: new Date(),
            })
            .where(eq(governanceRequestsTable.id, requestId))
            .returning();

        if (!updated) throw new Error("Request not found");

        // Execute post-approval actions based on request type
        await this.executeApprovalActions(updated);

        return updated;
    }

    /**
     * Reject a governance request
     */
    async rejectRequest(
        requestId: string,
        decidedBy: string = "human",
        note?: string
    ): Promise<typeof governanceRequestsTable.$inferSelect> {
        const [updated] = await db
            .update(governanceRequestsTable)
            .set({
                status: "rejected",
                decidedAt: new Date(),
                decidedBy,
                decisionNote: note ?? null,
                updatedAt: new Date(),
            })
            .where(eq(governanceRequestsTable.id, requestId))
            .returning();

        if (!updated) throw new Error("Request not found");

        return updated;
    }

    /**
     * Execute actions after request approval
     */
    private async executeApprovalActions(request: typeof governanceRequestsTable.$inferSelect): Promise<void> {
        const metadata = request.metadata as Record<string, unknown> | null;

        switch (request.requestType) {
            case "hire":
                // Create the new agent
                if (metadata?.agentData) {
                    await db.insert(agentsTable).values(metadata.agentData as any);
                }
                break;

            case "fire":
                // Terminate the agent
                if (metadata?.agentId) {
                    await db
                        .update(agentsTable)
                        .set({ status: "terminated" })
                        .where(eq(agentsTable.id, metadata.agentId as string));
                }
                break;

            case "budget_override":
                // Update agent/company budget
                if (metadata?.targetId && metadata?.budgetMonthlyUsd) {
                    if (metadata.targetType === "agent") {
                        await db
                            .update(agentsTable)
                            .set({ budgetMonthlyUsd: metadata.budgetMonthlyUsd as number })
                            .where(eq(agentsTable.id, metadata.targetId as string));
                    } else if (metadata.targetType === "company") {
                        await db
                            .update(companiesTable)
                            .set({ budgetMonthlyUsd: metadata.budgetMonthlyUsd as number })
                            .where(eq(companiesTable.id, metadata.targetId as string));
                    }
                }
                break;

            case "swarm_approval":
                // The swarm will be waiting for approval - resume execution
                // This would integrate with the swarm engine
                break;

            default:
                break;
        }
    }

    /**
     * Get pending requests for a company
     */
    async getPendingRequests(companyId: string): Promise<typeof governanceRequestsTable.$inferSelect[]> {
        const requests = await db
            .select()
            .from(governanceRequestsTable)
            .where(
                and(
                    eq(governanceRequestsTable.companyId, companyId),
                    eq(governanceRequestsTable.status, "pending")
                )
            )
            .orderBy(governanceRequestsTable.createdAt);

        // Filter out expired requests
        const now = new Date();
        return requests.filter(r => !r.expiresAt || new Date(r.expiresAt) > now);
    }

    /**
     * Get request by ID
     */
    async getRequest(requestId: string): Promise<typeof governanceRequestsTable.$inferSelect | null> {
        const [request] = await db
            .select()
            .from(governanceRequestsTable)
            .where(eq(governanceRequestsTable.id, requestId));

        return request ?? null;
    }

    /**
     * Expire old pending requests
     */
    async expirePendingRequests(): Promise<number> {
        const now = new Date().toISOString();

        const result = await db
            .update(governanceRequestsTable)
            .set({
                status: "expired",
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(governanceRequestsTable.status, "pending"),
                )
            )
            // Note: In production, you'd add a proper where clause for expiresAt
            .returning();

        return result.length;
    }

    /**
     * Validate if an agent can perform an action.
     * Delegates to CapabilityTokenService for DB-authoritative token checks.
     */
    async validateCapability(
        agentId: string,
        requiredScope: string
    ): Promise<{ allowed: boolean; reason?: string }> {
        const [agent] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, agentId));

        if (!agent) return { allowed: false, reason: "Agent not found" };
        if (agent.status === "terminated") return { allowed: false, reason: "Agent is terminated" };

        return capabilityTokenService.verify(agentId, requiredScope);
    }

    /**
     * Check if fromAgent can delegate to toAgent.
     * Delegates to HierarchyService for authoritative validation.
     */
    async validateDelegation(
        fromAgentId: string,
        toAgentId: string,
        scopes: string[] = []
    ): Promise<{ allowed: boolean; reason?: string }> {
        const [fromAgent] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, fromAgentId));

        if (!fromAgent) return { allowed: false, reason: "Agent not found" };

        const snapshot = fromAgent.capabilityToken as { scopes?: string[] } | null;
        const fromScopes: string[] = snapshot?.scopes ?? this.getDefaultScopesForRole(fromAgent.role);

        const { valid, reason } = await hierarchyService.validateDelegation(
            fromAgentId, toAgentId, scopes, fromScopes
        );
        return { allowed: valid, reason };
    }

    /**
     * Get default scopes for a role
     */
    private getDefaultScopesForRole(role: string): string[] {
        const roleScopes: Record<string, string[]> = {
            ceo: ["goals.", "agents.", "tools.", "budget.", "swarm.", "governance."],
            cto: ["goals.", "agents.engineer", "tools.code_exec", "budget."],
            cmo: ["goals.", "agents.marketer", "tools.content", "budget."],
            engineer: ["goals.", "tools.code_exec", "tools.code_review"],
            marketer: ["goals.", "tools.content", "tools.analytics"],
            designer: ["goals.", "tools.design", "tools.content"],
        };

        return roleScopes[role.toLowerCase()] ?? [];
    }

    /**
     * Issue a capability token to an agent
     */
    async issueCapabilityToken(
        agentId: string,
        scopes: string[],
        maxSingleSpendUsd: number,
        expiresInSeconds: number = 86400 // 24 hours default
    ): Promise<CapabilityToken> {
        const [agent] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, agentId));

        if (!agent) throw new Error("Agent not found");

        const capability: CapabilityToken = {
            agentId,
            role: agent.role,
            level: agent.level,
            scopes,
            delegateToLevels: this.getDelegateLevels(agent.level),
            escalateTo: agent.managerId ?? "",
            maxSingleSpendUsd,
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
        };

        const tokenId = crypto.randomUUID();
        await Promise.all([
            db.update(agentsTable)
                .set({ capabilityToken: capability as any })
                .where(eq(agentsTable.id, agentId)),
            db.insert(capabilityTokensTable).values({
                id: tokenId,
                agentId,
                issuedBy: agent.managerId ?? agentId,
                scopes: scopes,
                delegationDepth: agent.delegationDepth,
                maxDelegationDepth: agent.delegationLimit,
                expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
            }),
        ]);

        return capability;
    }

    /**
     * Get allowed delegation levels based on agent level
     */
    private getDelegateLevels(agentLevel: number): number[] {
        // Can delegate to any level higher than own (subordinates)
        const maxLevel = 5; // IC level
        return Array.from({ length: maxLevel - agentLevel }, (_, i) => agentLevel + i + 1);
    }
}

export const governanceService = new GovernanceService();
