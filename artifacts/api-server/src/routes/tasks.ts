import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, agentTasksTable, insertAgentTaskSchema } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

const TASK_STATUSES = [
  "pending",
  "claimed",
  "in_progress",
  "review",
  "done",
  "failed",
  "cancelled",
] as const;

// Fields that callers are allowed to update on a task.
// Excludes id, companyId, goalId, title, description, version (auto-incremented), claimedBy, and timestamps.
const patchTaskSchema = insertAgentTaskSchema
  .pick({ status: true, result: true })
  .partial();

router.get("/companies/:companyId/tasks", async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { status, agentId } = req.query;

    const conditions = [eq(agentTasksTable.companyId, companyId)];
    if (status && typeof status === "string") {
      if (!TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
        return next(
          new ApiError(
            400,
            `Invalid status "${status}". Allowed values: ${TASK_STATUSES.join(", ")}`,
          ),
        );
      }
      conditions.push(eq(agentTasksTable.status, status as (typeof TASK_STATUSES)[number]));
    }
    if (agentId && typeof agentId === "string") {
      conditions.push(eq(agentTasksTable.claimedBy, agentId));
    }

    const query = db
      .select()
      .from(agentTasksTable)
      .where(and(...conditions))
      .$dynamic();

    const tasks = await query.orderBy(agentTasksTable.createdAt);

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/tasks", async (req, res, next) => {
  try {
    const parsed = insertAgentTaskSchema.safeParse({
      id: crypto.randomUUID(),
      companyId: req.params.companyId,
      version: 0,
      ...req.body,
    });
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }
    const [task] = await db.insert(agentTasksTable).values(parsed.data).returning();
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.patch("/companies/:companyId/tasks/:taskId", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(agentTasksTable)
      .where(
        and(
          eq(agentTasksTable.companyId, req.params.companyId),
          eq(agentTasksTable.id, req.params.taskId),
        ),
      );
    if (!existing) return next(new ApiError(404, "Task not found"));

    const parsed = patchTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }

    const [updated] = await db
      .update(agentTasksTable)
      .set({ ...parsed.data, version: existing.version + 1, updatedAt: new Date() })
      .where(eq(agentTasksTable.id, req.params.taskId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/tasks/:taskId/claim", async (req, res, next) => {
  try {
    const { agentId, version } = req.body as { agentId: string; version: number };
    if (!agentId || version === undefined) {
      return next(new ApiError(400, "agentId and version are required"));
    }

    const [existing] = await db
      .select()
      .from(agentTasksTable)
      .where(
        and(
          eq(agentTasksTable.companyId, req.params.companyId),
          eq(agentTasksTable.id, req.params.taskId),
        ),
      );
    if (!existing) return next(new ApiError(404, "Task not found"));
    if (existing.version !== version) {
      return res.status(409).json({ error: "Version conflict", current: existing.version });
    }
    if (existing.status !== "pending") {
      return res.status(409).json({ error: "Task already claimed", status: existing.status });
    }

    const [claimed] = await db
      .update(agentTasksTable)
      .set({
        claimedBy: agentId,
        status: "claimed",
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(agentTasksTable.id, req.params.taskId),
          eq(agentTasksTable.version, version),
        ),
      )
      .returning();

    if (!claimed) {
      return res.status(409).json({ error: "Version conflict" });
    }

    res.json(claimed);
  } catch (err) {
    next(err);
  }
});

export default router;
