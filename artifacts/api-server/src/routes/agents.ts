import { Router } from "express";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db, agentsTable, capabilityTokensTable, insertAgentSchema, type Agent } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";
import { capabilityTokenService } from "../services/capabilityTokenService.js";
import { hierarchyService } from "../services/hierarchyService.js";

const router = Router();

// Fields that callers are allowed to update on an agent.
// Excludes id, companyId, capabilityToken, budget fields, delegation settings, and timestamps.
const patchAgentSchema = insertAgentSchema
  .pick({
    name: true,
    role: true,
    level: true,
    title: true,
    managerId: true,
    model: true,
    systemPrompt: true,
    tools: true,
    status: true,
    heartbeatIntervalSec: true,
    nextHeartbeatAt: true,
    deskX: true,
    deskY: true,
    spriteKey: true,
  })
  .partial();

router.get("/companies/:companyId/agents", async (req, res, next) => {
  try {
    const agents = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.companyId, req.params.companyId))
      .orderBy(agentsTable.level, agentsTable.name);
    res.json(agents);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/agents", async (req, res, next) => {
  try {
    const parsed = insertAgentSchema.safeParse({
      id: crypto.randomUUID(),
      companyId: req.params.companyId,
      ...req.body,
    });
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }
    const [agent] = await db.insert(agentsTable).values(parsed.data).returning();
    res.status(201).json(agent);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/agents/org-chart", async (req, res, next) => {
  try {
    const agents = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.companyId, req.params.companyId));

    type OrgNode = { agent: Agent; children: OrgNode[] };

    function buildTree(agents: Agent[], managerId: string | null = null): OrgNode[] {
      return agents
        .filter((a) => (a.managerId ?? null) === managerId)
        .map((a) => ({ agent: a, children: buildTree(agents, a.id) }));
    }

    res.json(buildTree(agents));
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/agents/:agentId", async (req, res, next) => {
  try {
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, req.params.companyId),
          eq(agentsTable.id, req.params.agentId),
        ),
      );
    if (!agent) return next(new ApiError(404, "Agent not found"));
    res.json(agent);
  } catch (err) {
    next(err);
  }
});

router.patch("/companies/:companyId/agents/:agentId", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, req.params.companyId),
          eq(agentsTable.id, req.params.agentId),
        ),
      );
    if (!existing) return next(new ApiError(404, "Agent not found"));

    const parsed = patchAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }

    const [updated] = await db
      .update(agentsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(agentsTable.id, req.params.agentId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/companies/:companyId/agents/:agentId", async (req, res, next) => {
  try {
    const result = await db
      .delete(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, req.params.companyId),
          eq(agentsTable.id, req.params.agentId),
        ),
      )
      .returning();
    if (result.length === 0) return next(new ApiError(404, "Agent not found"));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── Capability Token routes ──────────────────────────────────────────────────

// GET active (non-revoked) tokens for an agent
router.get("/companies/:companyId/agents/:agentId/capability-tokens", async (req, res, next) => {
  try {
    const { companyId, agentId } = req.params;
    const [agent] = await db.select().from(agentsTable).where(
      and(eq(agentsTable.companyId, companyId), eq(agentsTable.id, agentId))
    );
    if (!agent) return next(new ApiError(404, "Agent not found"));

    const tokens = await db
      .select()
      .from(capabilityTokensTable)
      .where(and(eq(capabilityTokensTable.agentId, agentId), isNull(capabilityTokensTable.revokedAt)))
      .orderBy(desc(capabilityTokensTable.createdAt));
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// POST issue a new capability token to an agent
router.post("/companies/:companyId/agents/:agentId/capability-tokens", async (req, res, next) => {
  try {
    const { companyId, agentId } = req.params;
    const { scopes, maxSingleSpendUsd, expiresInSeconds } = req.body;
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return next(new ApiError(400, "scopes must be a non-empty array"));
    }
    const [agent] = await db.select().from(agentsTable).where(
      and(eq(agentsTable.companyId, companyId), eq(agentsTable.id, agentId))
    );
    if (!agent) return next(new ApiError(404, "Agent not found"));

    const token = await capabilityTokenService.mint({
      issuedBy: req.body.issuedBy ?? agentId,
      agentId,
      scopes,
      maxSingleSpendUsd: maxSingleSpendUsd ?? 10,
      ttlSeconds: expiresInSeconds ?? 86400,
    });
    res.status(201).json(token);
  } catch (err) {
    next(err);
  }
});

// DELETE revoke a specific capability token
router.delete("/companies/:companyId/agents/:agentId/capability-tokens/:tokenId", async (req, res, next) => {
  try {
    const { companyId, agentId, tokenId } = req.params;
    const [agent] = await db.select().from(agentsTable).where(
      and(eq(agentsTable.companyId, companyId), eq(agentsTable.id, agentId))
    );
    if (!agent) return next(new ApiError(404, "Agent not found"));

    await capabilityTokenService.revoke(tokenId);
    res.status(204).send();
  } catch (err) {
    if ((err as Error).message?.startsWith("Token not found")) {
      return next(new ApiError(404, "Token not found"));
    }
    next(err);
  }
});

// POST validate delegation from one agent to another (dry-run check)
router.post("/companies/:companyId/agents/:agentId/validate-delegation", async (req, res, next) => {
  try {
    const { companyId, agentId } = req.params;
    const { toAgentId, scopes } = req.body;
    if (!toAgentId) return next(new ApiError(400, "toAgentId is required"));
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return next(new ApiError(400, "scopes must be a non-empty array"));
    }

    const [from] = await db.select().from(agentsTable).where(
      and(eq(agentsTable.companyId, companyId), eq(agentsTable.id, agentId))
    );
    if (!from) return next(new ApiError(404, "Agent not found"));

    const snapshot = from.capabilityToken as { scopes?: string[] } | null;
    const fromScopes: string[] = snapshot?.scopes ?? [];

    const result = await hierarchyService.validateDelegation(agentId, toAgentId, scopes, fromScopes);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST delegate a subset of scopes to a direct report
router.post("/companies/:companyId/agents/:agentId/delegate", async (req, res, next) => {
  try {
    const { companyId, agentId } = req.params;
    const { toAgentId, scopes, maxSingleSpendUsd, ttlSeconds } = req.body;
    if (!toAgentId) return next(new ApiError(400, "toAgentId is required"));
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return next(new ApiError(400, "scopes must be a non-empty array"));
    }

    const [from] = await db.select().from(agentsTable).where(
      and(eq(agentsTable.companyId, companyId), eq(agentsTable.id, agentId))
    );
    if (!from) return next(new ApiError(404, "Agent not found"));

    const token = await capabilityTokenService.delegate({
      fromAgentId: agentId,
      toAgentId,
      scopes,
      maxSingleSpendUsd: maxSingleSpendUsd ?? 5,
      ttlSeconds,
    });
    res.status(201).json(token);
  } catch (err) {
    next(err);
  }
});

// GET reporting chain for an agent (upward to root)
router.get("/companies/:companyId/agents/:agentId/reporting-chain", async (req, res, next) => {
  try {
    const { companyId, agentId } = req.params;
    const [agent] = await db.select().from(agentsTable).where(
      and(eq(agentsTable.companyId, companyId), eq(agentsTable.id, agentId))
    );
    if (!agent) return next(new ApiError(404, "Agent not found"));

    const chain = await hierarchyService.getReportingChain(agentId);
    res.json(chain);
  } catch (err) {
    next(err);
  }
});

// GET direct reports for an agent
router.get("/companies/:companyId/agents/:agentId/direct-reports", async (req, res, next) => {
  try {
    const { companyId, agentId } = req.params;
    const [agent] = await db.select().from(agentsTable).where(
      and(eq(agentsTable.companyId, companyId), eq(agentsTable.id, agentId))
    );
    if (!agent) return next(new ApiError(404, "Agent not found"));

    const reports = await hierarchyService.getDirectReports(agentId);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

export default router;
