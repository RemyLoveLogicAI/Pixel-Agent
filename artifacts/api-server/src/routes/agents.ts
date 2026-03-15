import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, agentsTable, insertAgentSchema, type Agent } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

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

    const [updated] = await db
      .update(agentsTable)
      .set({ ...req.body, updatedAt: new Date() })
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

export default router;
