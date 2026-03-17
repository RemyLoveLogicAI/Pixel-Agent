import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, toolCallsTable } from "@workspace/db";

const router = Router();

router.get("/companies/:companyId/traces", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    const traces = await db
      .select()
      .from(toolCallsTable)
      .where(eq(toolCallsTable.companyId, req.params.companyId))
      .orderBy(desc(toolCallsTable.createdAt))
      .limit(limit);

    const filtered = req.query.agentId
      ? traces.filter((t) => t.agentId === req.query.agentId)
      : traces;

    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/traces/:traceId", async (req, res, next) => {
  try {
    const spans = await db
      .select()
      .from(toolCallsTable)
      .where(
        and(
          eq(toolCallsTable.companyId, req.params.companyId),
          eq(toolCallsTable.traceId, req.params.traceId),
        ),
      )
      .orderBy(toolCallsTable.createdAt);

    res.json(spans);
  } catch (err) {
    next(err);
  }
});

export default router;
