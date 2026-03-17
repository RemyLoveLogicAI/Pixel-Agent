import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, companiesTable, agentsTable, budgetAlertsTable } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

router.get("/companies/:companyId/budget", async (req, res, next) => {
  try {
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, req.params.companyId));
    if (!company) return next(new ApiError(404, "Company not found"));

    const agents = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.companyId, req.params.companyId));

    const agentSummaries = agents.map((a) => ({
      agentId: a.id,
      name: a.name,
      budgetMonthlyUsd: a.budgetMonthlyUsd,
      budgetUsedUsd: a.budgetUsedUsd,
      utilizationPct: a.budgetMonthlyUsd > 0
        ? Math.round((a.budgetUsedUsd / a.budgetMonthlyUsd) * 100)
        : 0,
    }));

    res.json({
      companyId: company.id,
      budgetMonthlyUsd: company.budgetMonthlyUsd,
      budgetUsedUsd: company.budgetUsedUsd,
      utilizationPct: company.budgetMonthlyUsd > 0
        ? Math.round((company.budgetUsedUsd / company.budgetMonthlyUsd) * 100)
        : 0,
      circuitBreaker: company.circuitBreaker,
      agents: agentSummaries,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/budget/alerts", async (req, res, next) => {
  try {
    const alerts = await db
      .select()
      .from(budgetAlertsTable)
      .where(eq(budgetAlertsTable.companyId, req.params.companyId))
      .orderBy(budgetAlertsTable.createdAt);
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

router.patch("/companies/:companyId/budget/agents/:agentId", async (req, res, next) => {
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

    const { budgetMonthlyUsd, budgetUsedUsd } = req.body as {
      budgetMonthlyUsd?: number;
      budgetUsedUsd?: number;
    };

    if (budgetMonthlyUsd !== undefined && (typeof budgetMonthlyUsd !== "number" || budgetMonthlyUsd < 0)) {
      return next(new ApiError(400, "budgetMonthlyUsd must be a non-negative number"));
    }
    if (budgetUsedUsd !== undefined && (typeof budgetUsedUsd !== "number" || budgetUsedUsd < 0)) {
      return next(new ApiError(400, "budgetUsedUsd must be a non-negative number"));
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (budgetMonthlyUsd !== undefined) updates.budgetMonthlyUsd = budgetMonthlyUsd;
    if (budgetUsedUsd !== undefined) updates.budgetUsedUsd = budgetUsedUsd;

    const [updated] = await db
      .update(agentsTable)
      .set(updates)
      .where(eq(agentsTable.id, req.params.agentId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
