import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, goalsTable, insertGoalSchema, type Goal } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

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

    const updateData = { ...req.body, updatedAt: new Date() };
    if (req.body.status === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(goalsTable)
      .set(updateData)
      .where(eq(goalsTable.id, req.params.goalId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
