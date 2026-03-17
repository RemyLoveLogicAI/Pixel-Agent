import { Router } from "express";
import path from "path";
import fs from "fs/promises";
import { and, eq } from "drizzle-orm";
import {
  db,
  workspacesTable,
  insertWorkspaceSchema,
  workspaceSnapshotsTable,
  insertWorkspaceSnapshotSchema,
  mcpConnectionsTable,
  insertMcpConnectionSchema,
} from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";
import { broadcastEvent } from "./events.js";
import { governanceService } from "../services/governanceService.js";

const router = Router();

function defaultWorkspaceRoot(companyId: string, workspaceId: string): string {
  // Local-dev default. In production this should be a persistent volume mount.
  return path.join(process.cwd(), ".workspace-data", companyId, workspaceId);
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspaces
// ─────────────────────────────────────────────────────────────────────────────

router.get("/companies/:companyId/workspaces", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.companyId, req.params.companyId))
      .orderBy(workspacesTable.createdAt);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/workspaces", async (req, res, next) => {
  try {
    const workspaceId = crypto.randomUUID();
    const fsRoot = req.body?.fsRoot ?? defaultWorkspaceRoot(req.params.companyId, workspaceId);

    const parsed = insertWorkspaceSchema.safeParse({
      id: workspaceId,
      companyId: req.params.companyId,
      name: req.body?.name ?? "Workspace",
      runtimeType: req.body?.runtimeType ?? "local_dir",
      fsRoot,
      status: "active",
    });
    if (!parsed.success) return next(new ApiError(400, parsed.error.message));

    await ensureDir(parsed.data.fsRoot);

    const [created] = await db.insert(workspacesTable).values(parsed.data).returning();

    broadcastEvent(req.params.companyId, { type: "workspace.created", data: { workspaceId: created.id } });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/workspaces/:workspaceId", async (req, res, next) => {
  try {
    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(
        and(eq(workspacesTable.companyId, req.params.companyId), eq(workspacesTable.id, req.params.workspaceId)),
      );
    if (!workspace) return next(new ApiError(404, "Workspace not found"));
    res.json(workspace);
  } catch (err) {
    next(err);
  }
});

router.patch("/companies/:companyId/workspaces/:workspaceId", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(workspacesTable)
      .where(
        and(eq(workspacesTable.companyId, req.params.companyId), eq(workspacesTable.id, req.params.workspaceId)),
      );
    if (!existing) return next(new ApiError(404, "Workspace not found"));

    const [updated] = await db
      .update(workspacesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(workspacesTable.id, req.params.workspaceId))
      .returning();

    broadcastEvent(req.params.companyId, { type: "workspace.updated", data: { workspaceId: updated.id } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Snapshots
// ─────────────────────────────────────────────────────────────────────────────

router.get("/companies/:companyId/workspaces/:workspaceId/snapshots", async (req, res, next) => {
  try {
    const snapshots = await db
      .select()
      .from(workspaceSnapshotsTable)
      .where(eq(workspaceSnapshotsTable.workspaceId, req.params.workspaceId))
      .orderBy(workspaceSnapshotsTable.createdAt);
    res.json(snapshots);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/workspaces/:workspaceId/snapshots", async (req, res, next) => {
  try {
    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(
        and(eq(workspacesTable.companyId, req.params.companyId), eq(workspacesTable.id, req.params.workspaceId)),
      );
    if (!workspace) return next(new ApiError(404, "Workspace not found"));

    const snapshotId = crypto.randomUUID();

    const request = await governanceService.createRequest({
      companyId: req.params.companyId,
      requestType: "strategy_change",
      description: `Create snapshot for workspace ${workspace.id}`,
      metadata: {
        companyId: req.params.companyId,
        operation: "workspace.snapshot.create",
        workspaceId: workspace.id,
        snapshotId,
        label: req.body?.label ?? `Snapshot ${new Date().toISOString()}`,
        createdBy: req.body?.createdBy ?? "human",
      },
    });

    broadcastEvent(req.params.companyId, {
      type: "workspace.snapshot_pending_approval",
      data: { workspaceId: workspace.id, snapshotId, governanceRequestId: request.id },
    });

    res.status(202).json({ needsApproval: true, governanceRequestId: request.id, snapshotId });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/companies/:companyId/workspaces/:workspaceId/snapshots/:snapshotId/restore",
  async (req, res, next) => {
    try {
      const [workspace] = await db
        .select()
        .from(workspacesTable)
        .where(
          and(eq(workspacesTable.companyId, req.params.companyId), eq(workspacesTable.id, req.params.workspaceId)),
        );
      if (!workspace) return next(new ApiError(404, "Workspace not found"));

      const [snapshot] = await db
        .select()
        .from(workspaceSnapshotsTable)
        .where(
          and(
            eq(workspaceSnapshotsTable.workspaceId, workspace.id),
            eq(workspaceSnapshotsTable.id, req.params.snapshotId),
          ),
        );
      if (!snapshot) return next(new ApiError(404, "Snapshot not found"));

      const request = await governanceService.createRequest({
        companyId: req.params.companyId,
        requestType: "strategy_change",
        description: `Restore snapshot ${snapshot.id} for workspace ${workspace.id}`,
        metadata: {
          companyId: req.params.companyId,
          operation: "workspace.snapshot.restore",
          workspaceId: workspace.id,
          snapshotId: snapshot.id,
        },
      });

      broadcastEvent(req.params.companyId, {
        type: "workspace.snapshot_restore_pending_approval",
        data: { workspaceId: workspace.id, snapshotId: snapshot.id, governanceRequestId: request.id },
      });

      res.status(202).json({ needsApproval: true, governanceRequestId: request.id });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// MCP connections
// ─────────────────────────────────────────────────────────────────────────────

router.get("/companies/:companyId/workspaces/:workspaceId/mcp", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(mcpConnectionsTable)
      .where(eq(mcpConnectionsTable.workspaceId, req.params.workspaceId))
      .orderBy(mcpConnectionsTable.createdAt);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/workspaces/:workspaceId/mcp", async (req, res, next) => {
  try {
    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(
        and(eq(workspacesTable.companyId, req.params.companyId), eq(workspacesTable.id, req.params.workspaceId)),
      );
    if (!workspace) return next(new ApiError(404, "Workspace not found"));

    const connectionId = crypto.randomUUID();
    if (!req.body?.serverUrl && !req.body?.localCommand) {
      return next(new ApiError(400, "Either serverUrl or localCommand is required"));
    }

    const request = await governanceService.createRequest({
      companyId: req.params.companyId,
      requestType: "tool_access",
      description: `Create MCP connection '${req.body?.name}' for workspace ${workspace.id}`,
      metadata: {
        companyId: req.params.companyId,
        operation: "workspace.mcp.create",
        workspaceId: workspace.id,
        connectionId,
        name: req.body?.name,
        serverUrl: req.body?.serverUrl ?? null,
        localCommand: req.body?.localCommand ?? null,
        scopes: req.body?.scopes ?? [],
      },
    });

    broadcastEvent(req.params.companyId, {
      type: "workspace.mcp_connection_pending_approval",
      data: { workspaceId: workspace.id, connectionId, governanceRequestId: request.id },
    });

    res.status(202).json({ needsApproval: true, governanceRequestId: request.id, connectionId });
  } catch (err) {
    next(err);
  }
});

router.patch("/companies/:companyId/workspaces/:workspaceId/mcp/:connectionId", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(mcpConnectionsTable)
      .where(
        and(eq(mcpConnectionsTable.workspaceId, req.params.workspaceId), eq(mcpConnectionsTable.id, req.params.connectionId)),
      );
    if (!existing) return next(new ApiError(404, "MCP connection not found"));

    const request = await governanceService.createRequest({
      companyId: req.params.companyId,
      requestType: "tool_access",
      description: `Update MCP connection ${existing.id} for workspace ${req.params.workspaceId}`,
      metadata: {
        companyId: req.params.companyId,
        operation: "workspace.mcp.update",
        workspaceId: req.params.workspaceId,
        connectionId: existing.id,
        patch: req.body ?? {},
      },
    });

    broadcastEvent(req.params.companyId, {
      type: "workspace.mcp_connection_update_pending_approval",
      data: { workspaceId: req.params.workspaceId, connectionId: existing.id, governanceRequestId: request.id },
    });

    res.status(202).json({ needsApproval: true, governanceRequestId: request.id });
  } catch (err) {
    next(err);
  }
});

router.delete("/companies/:companyId/workspaces/:workspaceId/mcp/:connectionId", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(mcpConnectionsTable)
      .where(
        and(eq(mcpConnectionsTable.workspaceId, req.params.workspaceId), eq(mcpConnectionsTable.id, req.params.connectionId)),
      );
    if (!existing) return next(new ApiError(404, "MCP connection not found"));

    const request = await governanceService.createRequest({
      companyId: req.params.companyId,
      requestType: "tool_access",
      description: `Delete MCP connection ${existing.id} for workspace ${req.params.workspaceId}`,
      metadata: {
        companyId: req.params.companyId,
        operation: "workspace.mcp.delete",
        workspaceId: req.params.workspaceId,
        connectionId: existing.id,
      },
    });

    broadcastEvent(req.params.companyId, {
      type: "workspace.mcp_connection_delete_pending_approval",
      data: { workspaceId: req.params.workspaceId, connectionId: existing.id, governanceRequestId: request.id },
    });

    res.status(202).json({ needsApproval: true, governanceRequestId: request.id });
  } catch (err) {
    next(err);
  }
});

export default router;

