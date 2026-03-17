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
import { triggerCompanyHeartbeat, heartbeatRunner } from "../services/heartbeatRunner.js";
import { heartbeatScheduler } from "../services/heartbeatScheduler.js";

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

// POST mark a dead-letter entry as resolved (manual dismiss)
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

// POST retry a dead-letter entry (re-run the failed agent)
router.post("/companies/:companyId/heartbeat/dead-letters/:entryId/retry", async (req, res, next) => {
  try {
    const result = await heartbeatRunner.retryDeadLetter(req.params.entryId);
    res.json(result);
  } catch (err) {
    if ((err as Error).message === "Dead-letter entry not found") {
      return next(new ApiError(404, "Dead-letter entry not found"));
    }
    if ((err as Error).message === "Dead-letter entry already resolved") {
      return next(new ApiError(409, "Dead-letter entry already resolved"));
    }
    next(err);
  }
});

// ── Scheduler control routes ──────────────────────────────────────────────────

// GET scheduler status
router.get("/heartbeat/scheduler", (_req, res) => {
  res.json(heartbeatScheduler.status());
});

// POST start the global scheduler
router.post("/heartbeat/scheduler/start", (_req, res) => {
  heartbeatScheduler.start();
  res.json(heartbeatScheduler.status());
});

// POST stop the global scheduler
router.post("/heartbeat/scheduler/stop", (_req, res) => {
  heartbeatScheduler.stop();
  res.json(heartbeatScheduler.status());
});

// POST force an immediate scheduler tick (all active companies)
router.post("/heartbeat/scheduler/tick", async (_req, res, next) => {
  try {
    await heartbeatScheduler.tick();
    res.json({ triggered: true, ...heartbeatScheduler.status() });
  } catch (err) {
    next(err);
  }
});

export default router;
