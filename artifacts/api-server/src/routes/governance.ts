import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, governanceRequestsTable, insertGovernanceRequestSchema } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";
import { governanceService } from "../services/governanceService.js";
import { broadcastEvent } from "./events.js";

const router = Router();

router.get("/companies/:companyId/governance", async (req, res, next) => {
  try {
    const requests = await db
      .select()
      .from(governanceRequestsTable)
      .where(eq(governanceRequestsTable.companyId, req.params.companyId))
      .orderBy(governanceRequestsTable.createdAt);

    const filtered = req.query.status
      ? requests.filter((r) => r.status === req.query.status)
      : requests;

    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

router.post("/companies/:companyId/governance", async (req, res, next) => {
  try {
    const ttl = req.body.ttlSeconds ?? 3600;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const parsed = insertGovernanceRequestSchema.safeParse({
      id: crypto.randomUUID(),
      companyId: req.params.companyId,
      status: "pending",
      expiresAt,
      ...req.body,
    });
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }
    const [request] = await db
      .insert(governanceRequestsTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/companies/:companyId/governance/:requestId/approve",
  async (req, res, next) => {
    try {
      const [existing] = await db
        .select()
        .from(governanceRequestsTable)
        .where(
          and(
            eq(governanceRequestsTable.companyId, req.params.companyId),
            eq(governanceRequestsTable.id, req.params.requestId),
          ),
        );
      if (!existing) return next(new ApiError(404, "Governance request not found"));
      if (existing.status !== "pending") {
        return next(new ApiError(409, `Request already ${existing.status}`));
      }

      const updated = await governanceService.approveRequest(
        req.params.requestId,
        req.body?.decidedBy ?? "human",
        req.body?.note,
      );

      broadcastEvent(req.params.companyId, {
        type: "governance.decided",
        data: { requestId: updated.id, status: updated.status, requestType: updated.requestType },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/companies/:companyId/governance/:requestId/reject",
  async (req, res, next) => {
    try {
      const [existing] = await db
        .select()
        .from(governanceRequestsTable)
        .where(
          and(
            eq(governanceRequestsTable.companyId, req.params.companyId),
            eq(governanceRequestsTable.id, req.params.requestId),
          ),
        );
      if (!existing) return next(new ApiError(404, "Governance request not found"));
      if (existing.status !== "pending") {
        return next(new ApiError(409, `Request already ${existing.status}`));
      }

      const updated = await governanceService.rejectRequest(
        req.params.requestId,
        req.body?.decidedBy ?? "human",
        req.body?.note,
      );

      broadcastEvent(req.params.companyId, {
        type: "governance.decided",
        data: { requestId: updated.id, status: updated.status, requestType: updated.requestType },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
