import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, governanceRequestsTable, insertGovernanceRequestSchema } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

const GOVERNANCE_STATUSES = ["pending", "approved", "rejected", "expired"] as const;

router.get("/companies/:companyId/governance", async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status && typeof status === "string") {
      if (!GOVERNANCE_STATUSES.includes(status as (typeof GOVERNANCE_STATUSES)[number])) {
        return next(
          new ApiError(
            400,
            `Invalid status "${status}". Allowed values: ${GOVERNANCE_STATUSES.join(", ")}`,
          ),
        );
      }
    }

    const conditions = [eq(governanceRequestsTable.companyId, req.params.companyId)];
    if (status && typeof status === "string") {
      conditions.push(
        eq(governanceRequestsTable.status, status as (typeof GOVERNANCE_STATUSES)[number]),
      );
    }

    const requests = await db
      .select()
      .from(governanceRequestsTable)
      .where(and(...conditions))
      .orderBy(governanceRequestsTable.createdAt);

    res.json(requests);
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

      const [updated] = await db
        .update(governanceRequestsTable)
        .set({
          status: "approved",
          decidedAt: new Date(),
          decidedBy: req.body?.decidedBy ?? "human",
          decisionNote: req.body?.note ?? null,
          updatedAt: new Date(),
        })
        .where(eq(governanceRequestsTable.id, req.params.requestId))
        .returning();
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

      const [updated] = await db
        .update(governanceRequestsTable)
        .set({
          status: "rejected",
          decidedAt: new Date(),
          decidedBy: req.body?.decidedBy ?? "human",
          decisionNote: req.body?.note ?? null,
          updatedAt: new Date(),
        })
        .where(eq(governanceRequestsTable.id, req.params.requestId))
        .returning();
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
