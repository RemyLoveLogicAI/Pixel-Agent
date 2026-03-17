import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import {
  db,
  workflowRunsTable,
  workflowStepsTable,
  workspacesTable,
} from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";
import { broadcastEvent } from "./events.js";
import { governanceService } from "../services/governanceService.js";

const router = Router();

router.get("/companies/:companyId/workflows", async (req, res, next) => {
  try {
    const workspaceId = typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    // Company scoping: join via workspaceIds belonging to company (MVP).
    const workspaces = await db
      .select({ id: workspacesTable.id })
      .from(workspacesTable)
      .where(eq(workspacesTable.companyId, req.params.companyId));
    const workspaceIds = new Set(workspaces.map((w) => w.id));

    let runs = await db
      .select()
      .from(workflowRunsTable)
      .orderBy(desc(workflowRunsTable.createdAt))
      .limit(limit);

    runs = runs.filter((r) => workspaceIds.has(r.workspaceId));
    if (workspaceId) runs = runs.filter((r) => r.workspaceId === workspaceId);

    res.json(runs);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/workspaces/:workspaceId/workflows", async (req, res, next) => {
  try {
    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(and(eq(workspacesTable.companyId, req.params.companyId), eq(workspacesTable.id, req.params.workspaceId)));
    if (!workspace) return next(new ApiError(404, "Workspace not found"));

    const kind = req.body?.kind as string;
    if (!kind) return next(new ApiError(400, "kind is required"));

    const [created] = await db
      .insert(workflowRunsTable)
      .values({
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        kind: kind as any,
        status: "running",
        input: req.body?.input ?? null,
        output: null,
        traceId: req.body?.traceId ?? null,
      })
      .returning();

    broadcastEvent(req.params.companyId, { type: "workflow.created", data: { workflowRunId: created.id, workspaceId: workspace.id } });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/workflows/:workflowRunId", async (req, res, next) => {
  try {
    const [run] = await db.select().from(workflowRunsTable).where(eq(workflowRunsTable.id, req.params.workflowRunId));
    if (!run) return next(new ApiError(404, "Workflow run not found"));

    // Company scoping check via workspace
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, run.workspaceId));
    if (!workspace || workspace.companyId !== req.params.companyId) return next(new ApiError(404, "Workflow run not found"));

    const steps = await db
      .select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflowRunId, run.id))
      .orderBy(workflowStepsTable.idx);

    res.json({ ...run, steps });
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/workflows/:workflowRunId/steps", async (req, res, next) => {
  try {
    const [run] = await db.select().from(workflowRunsTable).where(eq(workflowRunsTable.id, req.params.workflowRunId));
    if (!run) return next(new ApiError(404, "Workflow run not found"));

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, run.workspaceId));
    if (!workspace || workspace.companyId !== req.params.companyId) return next(new ApiError(404, "Workflow run not found"));

    const name = req.body?.name as string;
    if (!name) return next(new ApiError(400, "name is required"));
    const requiresApproval = Boolean(req.body?.requiresApproval);

    const existingSteps = await db
      .select({ idx: workflowStepsTable.idx })
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflowRunId, run.id))
      .orderBy(desc(workflowStepsTable.idx))
      .limit(1);
    const nextIdx = (existingSteps[0]?.idx ?? -1) + 1;

    const stepId = crypto.randomUUID();

    if (requiresApproval) {
      const request = await governanceService.createRequest({
        companyId: req.params.companyId,
        requestType: "strategy_change",
        description: `Approve workflow step '${name}' for run ${run.id}`,
        metadata: {
          companyId: req.params.companyId,
          operation: "workflow.step.approve",
          workflowRunId: run.id,
          stepId,
        },
      });

      const [createdStep] = await db
        .insert(workflowStepsTable)
        .values({
          id: stepId,
          workflowRunId: run.id,
          idx: nextIdx,
          name,
          status: "blocked",
          requiresApproval: 1,
          governanceRequestId: request.id,
          input: req.body?.input ?? null,
          output: null,
          startedAt: new Date(),
        })
        .returning();

      await db.update(workflowRunsTable).set({ status: "paused" }).where(eq(workflowRunsTable.id, run.id));

      broadcastEvent(req.params.companyId, {
        type: "workflow.paused_for_approval",
        data: { workflowRunId: run.id, stepId, governanceRequestId: request.id },
      });

      return res.status(202).json({ needsApproval: true, governanceRequestId: request.id, step: createdStep });
    }

    const [created] = await db
      .insert(workflowStepsTable)
      .values({
        id: stepId,
        workflowRunId: run.id,
        idx: nextIdx,
        name,
        status: "running",
        requiresApproval: 0,
        governanceRequestId: null,
        input: req.body?.input ?? null,
        output: null,
        startedAt: new Date(),
      })
      .returning();

    broadcastEvent(req.params.companyId, { type: "workflow.step_created", data: { workflowRunId: run.id, stepId } });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/workflows/:workflowRunId/complete", async (req, res, next) => {
  try {
    const [run] = await db.select().from(workflowRunsTable).where(eq(workflowRunsTable.id, req.params.workflowRunId));
    if (!run) return next(new ApiError(404, "Workflow run not found"));

    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, run.workspaceId));
    if (!workspace || workspace.companyId !== req.params.companyId) return next(new ApiError(404, "Workflow run not found"));

    const [updated] = await db
      .update(workflowRunsTable)
      .set({ status: "completed", output: req.body?.output ?? null, completedAt: new Date() })
      .where(eq(workflowRunsTable.id, run.id))
      .returning();

    broadcastEvent(req.params.companyId, { type: "workflow.completed", data: { workflowRunId: updated.id } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;

