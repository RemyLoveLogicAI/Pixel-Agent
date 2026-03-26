import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, goalsTable, insertGoalSchema, type Goal } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

// Fields that callers are allowed to update on a goal.
// Excludes id, companyId, completedAt (set automatically), and timestamps.
const patchGoalSchema = insertGoalSchema
  .pick({
    title: true,
    description: true,
    status: true,
    priority: true,
    assignedTo: true,
    parentId: true,
    dueAt: true,
  })
  .partial();

router.get("/companies/:companyId/goals", async (req, res, next) => {
  try {
    const goals = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.companyId, req.params.companyId))
      .orderBy(goalsTable.priority, goalsTable.createdAt);
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/goals", async (req, res, next) => {
  try {
    const parsed = insertGoalSchema.safeParse({
      id: crypto.randomUUID(),
      companyId: req.params.companyId,
      ...req.body,
    });
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }
    const [goal] = await db.insert(goalsTable).values(parsed.data).returning();
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/goals/tree", async (req, res, next) => {
  try {
    const goals = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.companyId, req.params.companyId));

    type GoalNode = { goal: Goal; children: GoalNode[] };

    function buildTree(goals: Goal[], parentId: string | null = null): GoalNode[] {
      return goals
        .filter((g) => (g.parentId ?? null) === parentId)
        .map((g) => ({ goal: g, children: buildTree(goals, g.id) }));
    }

    res.json(buildTree(goals));
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/goals/:goalId", async (req, res, next) => {
  try {
    const [goal] = await db
      .select()
      .from(goalsTable)
      .where(
        and(
          eq(goalsTable.companyId, req.params.companyId),
          eq(goalsTable.id, req.params.goalId),
        ),
      );
    if (!goal) return next(new ApiError(404, "Goal not found"));
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.patch("/companies/:companyId/goals/:goalId", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(goalsTable)
      .where(
        and(
          eq(goalsTable.companyId, req.params.companyId),
          eq(goalsTable.id, req.params.goalId),
        ),
      );
    if (!existing) return next(new ApiError(404, "Goal not found"));

    const parsed = patchGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }

    const [updated] = await db
      .update(goalsTable)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
        ...(parsed.data.status === "completed" && !existing.completedAt
          ? { completedAt: new Date() }
          : {}),
      })
      .where(eq(goalsTable.id, req.params.goalId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
