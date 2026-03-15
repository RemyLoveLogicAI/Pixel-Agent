import { Router } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  swarmRunsTable,
  swarmAgentsTable,
  swarmMessagesTable,
  insertSwarmRunSchema,
} from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

router.get("/companies/:companyId/swarms", async (req, res, next) => {
  try {
    const swarms = await db
      .select()
      .from(swarmRunsTable)
      .where(eq(swarmRunsTable.companyId, req.params.companyId))
      .orderBy(swarmRunsTable.createdAt);
    res.json(swarms);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/swarms", async (req, res, next) => {
  try {
    const parsed = insertSwarmRunSchema.safeParse({
      id: crypto.randomUUID(),
      companyId: req.params.companyId,
      phase: "proposed",
      ...req.body,
    });
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }
    const [swarm] = await db.insert(swarmRunsTable).values(parsed.data).returning();
    res.status(202).json(swarm);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/swarms/:swarmId", async (req, res, next) => {
  try {
    const [swarm] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!swarm) return next(new ApiError(404, "Swarm not found"));

    const agents = await db
      .select()
      .from(swarmAgentsTable)
      .where(eq(swarmAgentsTable.swarmRunId, swarm.id));

    res.json({ ...swarm, agents });
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/swarms/:swarmId/cancel", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!existing) return next(new ApiError(404, "Swarm not found"));

    const terminal: string[] = ["completed", "failed", "dissolved", "cancelled"];
    if (terminal.includes(existing.phase)) {
      return next(new ApiError(409, `Swarm already in terminal phase: ${existing.phase}`));
    }

    const [updated] = await db
      .update(swarmRunsTable)
      .set({ phase: "cancelled", completedAt: new Date() })
      .where(eq(swarmRunsTable.id, req.params.swarmId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/swarms/:swarmId/messages", async (req, res, next) => {
  try {
    const [swarm] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!swarm) return next(new ApiError(404, "Swarm not found"));

    const messages = await db
      .select()
      .from(swarmMessagesTable)
      .where(eq(swarmMessagesTable.swarmRunId, req.params.swarmId))
      .orderBy(swarmMessagesTable.createdAt);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

export default router;
