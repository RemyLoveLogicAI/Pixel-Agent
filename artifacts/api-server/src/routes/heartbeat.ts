import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  heartbeatRunsTable,
  heartbeatAgentRunsTable,
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

export default router;
