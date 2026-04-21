import { Router } from "express";
import { and, eq, desc, notInArray } from "drizzle-orm";
import {
  db,
  swarmRunsTable,
  agentTasksTable,
  governanceRequestsTable,
  heartbeatRunsTable,
  workflowRunsTable,
  workspacesTable,
} from "@workspace/db";

const router = Router();

const SWARM_TERMINAL_PHASES = ["completed", "failed", "dissolved", "cancelled"] as const;

router.get("/companies/:companyId/clipboard", async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const [workspaces, workflows, tasks, governance, swarms, heartbeatRuns] = await Promise.all([
      db.select().from(workspacesTable).where(eq(workspacesTable.companyId, companyId)).orderBy(desc(workspacesTable.createdAt)),
      // workflowRuns are company-scoped via workspace membership (MVP: filter in-memory)
      db.select().from(workflowRunsTable).orderBy(desc(workflowRunsTable.createdAt)).limit(50),
      db
        .select()
        .from(agentTasksTable)
        .where(
          and(
            eq(agentTasksTable.companyId, companyId),
            // active tasks only
            notInArray(agentTasksTable.status, ["done", "failed", "cancelled"]),
          ),
        )
        .orderBy(desc(agentTasksTable.updatedAt))
        .limit(50),
      db
        .select()
        .from(governanceRequestsTable)
        .where(and(eq(governanceRequestsTable.companyId, companyId), eq(governanceRequestsTable.status, "pending")))
        .orderBy(desc(governanceRequestsTable.createdAt))
        .limit(50),
      db
        .select()
        .from(swarmRunsTable)
        .where(and(eq(swarmRunsTable.companyId, companyId), notInArray(swarmRunsTable.phase, SWARM_TERMINAL_PHASES as any)))
        .orderBy(desc(swarmRunsTable.createdAt))
        .limit(50),
      db
        .select()
        .from(heartbeatRunsTable)
        .where(eq(heartbeatRunsTable.companyId, companyId))
        .orderBy(desc(heartbeatRunsTable.startedAt))
        .limit(10),
    ]);

    const workspaceIds = new Set(workspaces.map((w) => w.id));
    const filteredWorkflows = workflows.filter((w) => workspaceIds.has(w.workspaceId) && (w.status === "running" || w.status === "paused"));

    res.json({
      workspaces,
      workflows: filteredWorkflows,
      tasks,
      governance,
      swarms,
      heartbeatRuns,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

