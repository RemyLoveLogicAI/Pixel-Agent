import { db, agentsTable, capabilityTokensTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { hierarchyService } from "./hierarchyService.js";

/** Shape stored in agents.capabilityToken JSONB for fast reads */
interface TokenSnapshot {
    tokenId: string;
    agentId: string;
    role: string;
    level: number;
    scopes: string[];
    delegationDepth: number;
    maxDelegationDepth: number;
    escalateTo: string;
    maxSingleSpendUsd: number;
    issuedAt: string;
    expiresAt: string;
}

const DEFAULT_SCOPES_BY_ROLE: Record<string, string[]> = {
    ceo: ["goals", "agents", "tools", "budget", "swarm", "governance"],
    cto: ["goals", "agents.engineer", "tools.code_exec", "budget"],
    cmo: ["goals", "agents.marketer", "tools.content", "budget"],
    engineer: ["goals", "tools.code_exec", "tools.code_review"],
    marketer: ["goals", "tools.content", "tools.analytics"],
    designer: ["goals", "tools.design", "tools.content"],
};

export class CapabilityTokenService {
    /**
     * Mint a new capability token for an agent.
     * Revokes any existing active tokens for that agent first (single active token policy).
     */
    async mint(params: {
        issuedBy: string;
        agentId: string;
        scopes: string[];
        maxSingleSpendUsd: number;
        ttlSeconds?: number;
        delegationDepth?: number;
        maxDelegationDepth?: number;
    }): Promise<typeof capabilityTokensTable.$inferSelect> {
        const {
            issuedBy,
            agentId,
            scopes,
            maxSingleSpendUsd,
            ttlSeconds = 86400,
            delegationDepth = 0,
            maxDelegationDepth = 3,
        } = params;

        const [agent] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, agentId));
        if (!agent) throw new Error(`Agent not found: ${agentId}`);

        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

        // Revoke all existing active tokens (single active token per agent)
        await db
            .update(capabilityTokensTable)
            .set({ revokedAt: new Date() })
            .where(
                and(
                    eq(capabilityTokensTable.agentId, agentId),
                    isNull(capabilityTokensTable.revokedAt),
                ),
            );

        const tokenId = crypto.randomUUID();
        const [token] = await db
            .insert(capabilityTokensTable)
            .values({
                id: tokenId,
                agentId,
                issuedBy,
                scopes,
                delegationDepth,
                maxDelegationDepth,
                expiresAt,
            })
            .returning();

        // Sync snapshot to agents.capabilityToken JSONB for fast reads
        const snapshot: TokenSnapshot = {
            tokenId,
            agentId,
            role: agent.role,
            level: agent.level,
            scopes,
            delegationDepth,
            maxDelegationDepth,
            escalateTo: agent.managerId ?? "",
            maxSingleSpendUsd,
            issuedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
        };
        await db
            .update(agentsTable)
            .set({ capabilityToken: snapshot as any, updatedAt: new Date() })
            .where(eq(agentsTable.id, agentId));

        return token;
    }

    /**
     * Verify that an agent holds an active token granting the requested scope.
     * Checks the DB record (not just the JSONB snapshot) so revocations are honoured.
     */
    async verify(
        agentId: string,
        scope: string,
    ): Promise<{ allowed: boolean; reason?: string; tokenId?: string }> {
        const now = new Date();

        const tokens = await db
            .select()
            .from(capabilityTokensTable)
            .where(
                and(
                    eq(capabilityTokensTable.agentId, agentId),
                    isNull(capabilityTokensTable.revokedAt),
                ),
            );

        const active = tokens.filter(t => !t.expiresAt || t.expiresAt > now);

        if (active.length === 0) {
            return { allowed: false, reason: "No active capability token" };
        }

        for (const token of active) {
            const tokenScopes = (token.scopes as string[]) ?? [];
            const granted = tokenScopes.some(
                s => scope === s || scope.startsWith(s + "."),
            );
            if (granted) return { allowed: true, tokenId: token.id };
        }

        return { allowed: false, reason: `Scope "${scope}" not granted by any active token` };
    }

    /**
     * Revoke a specific token by ID.
     * Also clears the JSONB snapshot on the agent if it references this token.
     */
    async revoke(tokenId: string): Promise<void> {
        const [token] = await db
            .update(capabilityTokensTable)
            .set({ revokedAt: new Date() })
            .where(eq(capabilityTokensTable.id, tokenId))
            .returning();

        if (!token) throw new Error(`Token not found: ${tokenId}`);

        // Clear snapshot from agent if it still points to this token
        const [agent] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, token.agentId));
        if (agent) {
            const snapshot = agent.capabilityToken as TokenSnapshot | null;
            if (snapshot?.tokenId === tokenId) {
                await db
                    .update(agentsTable)
                    .set({ capabilityToken: null, updatedAt: new Date() })
                    .where(eq(agentsTable.id, token.agentId));
            }
        }
    }

    /**
     * Delegate a subset of scopes from fromAgent to toAgent.
     * Validates hierarchy rules via HierarchyService, then mints a child token.
     */
    async delegate(params: {
        fromAgentId: string;
        toAgentId: string;
        scopes: string[];
        maxSingleSpendUsd: number;
        ttlSeconds?: number;
    }): Promise<typeof capabilityTokensTable.$inferSelect> {
        const { fromAgentId, toAgentId, scopes, maxSingleSpendUsd, ttlSeconds = 43200 } = params;

        const [fromAgent] = await db
            .select()
            .from(agentsTable)
            .where(eq(agentsTable.id, fromAgentId));
        if (!fromAgent) throw new Error(`Delegating agent not found: ${fromAgentId}`);

        // Derive current scopes from JSONB snapshot or fall back to role defaults
        const snapshot = fromAgent.capabilityToken as TokenSnapshot | null;
        const fromScopes: string[] =
            snapshot?.scopes ?? DEFAULT_SCOPES_BY_ROLE[fromAgent.role.toLowerCase()] ?? [];

        const { valid, reason } = await hierarchyService.validateDelegation(
            fromAgentId,
            toAgentId,
            scopes,
            fromScopes,
        );
        if (!valid) throw new Error(reason);

        const currentDepth = snapshot?.delegationDepth ?? 0;
        const maxDepth = snapshot?.maxDelegationDepth ?? fromAgent.delegationLimit;

        return this.mint({
            issuedBy: fromAgentId,
            agentId: toAgentId,
            scopes,
            maxSingleSpendUsd,
            ttlSeconds,
            delegationDepth: currentDepth + 1,
            maxDelegationDepth: maxDepth,
        });
    }

    /**
     * Return all non-revoked, non-expired tokens for an agent.
     */
    async getActiveTokens(
        agentId: string,
    ): Promise<typeof capabilityTokensTable.$inferSelect[]> {
        const now = new Date();
        const tokens = await db
            .select()
            .from(capabilityTokensTable)
            .where(
                and(
                    eq(capabilityTokensTable.agentId, agentId),
                    isNull(capabilityTokensTable.revokedAt),
                ),
            );
        return tokens.filter(t => !t.expiresAt || t.expiresAt > now);
    }
}

export const capabilityTokenService = new CapabilityTokenService();
