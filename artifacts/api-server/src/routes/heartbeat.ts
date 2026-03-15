import { Router } from "express";
import { eq, and, desc, isNull } from "drizzle-orm";
import {
  db,
  heartbeatRunsTable,
  heartbeatAgentRunsTable,
  heartbeatDeadLettersTable,
  agentsTable,
} from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";
import { triggerCompanyHeartbeat } from "../services/heartbeatRunner";

const router = Router();

router.post("/companies/:companyId/heartbeat", async (req, res, next) => {
  try {
    const trigger = (req.body?.trigger as string) ?? "manual";
    const result = await triggerCompanyHeartbeat(req.params.companyId, trigger as "scheduled" | "manual" | "event");
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/heartbeat/runs", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const runs = await db
      .select()
      .from(heartbeatRunsTable)
      .where(eq(heartbeatRunsTable.companyId, req.params.companyId))
      .orderBy(desc(heartbeatRunsTable.startedAt))
      .limit(limit);
    res.json(runs);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/heartbeat/runs/:runId", async (req, res, next) => {
  try {
    const [run] = await db
      .select()
      .from(heartbeatRunsTable)
      .where(
        and(
          eq(heartbeatRunsTable.companyId, req.params.companyId),
          eq(heartbeatRunsTable.id, req.params.runId),
        ),
      );
    if (!run) return next(new ApiError(404, "Heartbeat run not found"));

    const agentRuns = await db
      .select()
      .from(heartbeatAgentRunsTable)
      .where(eq(heartbeatAgentRunsTable.heartbeatRunId, run.id));

    res.json({ ...run, agentRuns });
  } catch (err) {
    next(err);
  }
});

// ── Dead-Letter Queue routes ─────────────────────────────────────────────────

// GET unresolved dead-letter entries for a company
router.get("/companies/:companyId/heartbeat/dead-letters", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const entries = await db
      .select({
        id: heartbeatDeadLettersTable.id,
        heartbeatRunId: heartbeatDeadLettersTable.heartbeatRunId,
        agentId: heartbeatDeadLettersTable.agentId,
        errorMessage: heartbeatDeadLettersTable.errorMessage,
        retryCount: heartbeatDeadLettersTable.retryCount,
        maxRetries: heartbeatDeadLettersTable.maxRetries,
        nextRetryAt: heartbeatDeadLettersTable.nextRetryAt,
        resolvedAt: heartbeatDeadLettersTable.resolvedAt,
        createdAt: heartbeatDeadLettersTable.createdAt,
      })
      .from(heartbeatDeadLettersTable)
      .innerJoin(heartbeatRunsTable, eq(heartbeatDeadLettersTable.heartbeatRunId, heartbeatRunsTable.id))
      .where(
        and(
          eq(heartbeatRunsTable.companyId, req.params.companyId),
          isNull(heartbeatDeadLettersTable.resolvedAt),
        ),
      )
      .orderBy(desc(heartbeatDeadLettersTable.createdAt))
      .limit(limit);
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// POST mark a dead-letter entry as resolved
router.post("/companies/:companyId/heartbeat/dead-letters/:entryId/resolve", async (req, res, next) => {
  try {
    const result = await db
      .update(heartbeatDeadLettersTable)
      .set({ resolvedAt: new Date() })
      .where(eq(heartbeatDeadLettersTable.id, req.params.entryId))
      .returning();
    if (result.length === 0) return next(new ApiError(404, "Dead-letter entry not found"));
    res.json(result[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
