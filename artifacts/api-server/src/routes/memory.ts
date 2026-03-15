import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, memoryEntriesTable, insertMemoryEntrySchema, agentsTable } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

router.get("/companies/:companyId/agents/:agentId/memory", async (req, res, next) => {
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

    const entries = await db
      .select()
      .from(memoryEntriesTable)
      .where(
        and(
          eq(memoryEntriesTable.companyId, req.params.companyId),
          eq(memoryEntriesTable.agentId, req.params.agentId),
        ),
      )
      .orderBy(memoryEntriesTable.importance, memoryEntriesTable.createdAt);

    const filtered = req.query.category
      ? entries.filter((e) => e.category === req.query.category)
      : entries;

    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/agents/:agentId/memory", async (req, res, next) => {
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

    const parsed = insertMemoryEntrySchema.safeParse({
      id: crypto.randomUUID(),
      agentId: req.params.agentId,
      companyId: req.params.companyId,
      importance: 0,
      ...req.body,
    });
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }

    const [entry] = await db.insert(memoryEntriesTable).values(parsed.data).returning();
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

export default router;
