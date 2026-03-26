import { Router } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  swarmRunsTable,
  swarmAgentsTable,
  swarmMessagesTable,
} from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";
import { swarmEngine } from "../services/swarmEngine.js";
import { swarmMessageBus } from "../services/swarmMessageBus.js";

const router = Router();

const TERMINAL_PHASES = new Set(["completed", "failed", "dissolved", "cancelled"]);

// ── List & create ─────────────────────────────────────────────────────────────

router.get("/companies/:companyId/swarms", async (req, res, next) => {
  try {
    const swarms = await db
      .select()
      .from(swarmRunsTable)
      .where(eq(swarmRunsTable.companyId, req.params.companyId))
      .orderBy(swarmRunsTable.createdAt);
    res.json(swarms);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /companies/:companyId/swarms
 * Propose a swarm. If estimated cost < threshold the swarm auto-advances to
 * `pending_approval` and is immediately queued for execution (202).
 * If governance approval is required, the swarm stays in `proposed` until
 * a governance request is approved.
 */
router.post("/companies/:companyId/swarms", async (req, res, next) => {
  try {
    const { goalId, leaderAgentId, taskDescription } = req.body;
    if (!leaderAgentId) return next(new ApiError(400, "leaderAgentId is required"));
    if (!taskDescription) return next(new ApiError(400, "taskDescription is required"));

    const result = await swarmEngine.proposeSwarm(
      req.params.companyId,
      goalId ?? null,
      leaderAgentId,
      taskDescription,
    );

    // If no governance approval needed, kick off the full lifecycle in the background
    if (!result.needsApproval) {
      swarmEngine.runSwarm(result.swarmId).catch((err) => {
        console.error(`[Swarm ${result.swarmId}] auto-run error:`, err);
      });
    }

    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

// ── Single swarm ──────────────────────────────────────────────────────────────

router.get("/companies/:companyId/swarms/:swarmId", async (req, res, next) => {
  try {
    const [swarm] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!swarm) return next(new ApiError(404, "Swarm not found"));

    const agents = await db
      .select()
      .from(swarmAgentsTable)
      .where(eq(swarmAgentsTable.swarmRunId, swarm.id));

    res.json({ ...swarm, agents });
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId/swarms/:swarmId/status", async (req, res, next) => {
  try {
    const [swarm] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!swarm) return next(new ApiError(404, "Swarm not found"));

    const status = await swarmEngine.getSwarmStatus(req.params.swarmId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// ── Phase transitions ─────────────────────────────────────────────────────────

/** Approve a swarm that required governance review. Triggers full auto-run. */
router.post("/companies/:companyId/swarms/:swarmId/approve", async (req, res, next) => {
  try {
    const [swarm] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!swarm) return next(new ApiError(404, "Swarm not found"));

    const result = await swarmEngine.approveSwarm(
      req.params.swarmId,
      req.body?.approvedBy ?? "human",
    );

    // Kick off full lifecycle in the background
    swarmEngine.runSwarm(req.params.swarmId).catch((err) => {
      console.error(`[Swarm ${req.params.swarmId}] post-approval run error:`, err);
    });

    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

/** Manually advance to spawn phase (for debugging / step-by-step mode). */
router.post("/companies/:companyId/swarms/:swarmId/spawn", async (req, res, next) => {
  try {
    const result = await swarmEngine.spawnSwarm(req.params.swarmId);
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

/** Manually advance to execute phase. */
router.post("/companies/:companyId/swarms/:swarmId/execute", async (req, res, next) => {
  try {
    const result = await swarmEngine.executeSwarm(req.params.swarmId);
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

/** Manually advance to synthesize phase. */
router.post("/companies/:companyId/swarms/:swarmId/synthesize", async (req, res, next) => {
  try {
    const result = await swarmEngine.synthesizeSwarm(req.params.swarmId);
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

/** Manually dissolve (archive and complete) a synthesized swarm. */
router.post("/companies/:companyId/swarms/:swarmId/dissolve", async (req, res, next) => {
  try {
    const result = await swarmEngine.dissolveSwarm(req.params.swarmId);
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

/** Cancel a swarm that hasn't reached a terminal state. */
router.post("/companies/:companyId/swarms/:swarmId/cancel", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!existing) return next(new ApiError(404, "Swarm not found"));
    if (TERMINAL_PHASES.has(existing.phase)) {
      return next(new ApiError(409, `Swarm already in terminal phase: ${existing.phase}`));
    }

    const [updated] = await db
      .update(swarmRunsTable)
      .set({ phase: "cancelled", completedAt: new Date() })
      .where(eq(swarmRunsTable.id, req.params.swarmId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get("/companies/:companyId/swarms/:swarmId/messages", async (req, res, next) => {
  try {
    const [swarm] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!swarm) return next(new ApiError(404, "Swarm not found"));

    const messages = await swarmMessageBus.getMessages(
      req.params.swarmId,
      req.query.topic as string | undefined,
    );
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

/** Publish a message from a swarm agent (for external/test use). */
router.post("/companies/:companyId/swarms/:swarmId/messages", async (req, res, next) => {
  try {
    const [swarm] = await db
      .select()
      .from(swarmRunsTable)
      .where(
        and(
          eq(swarmRunsTable.companyId, req.params.companyId),
          eq(swarmRunsTable.id, req.params.swarmId),
        ),
      );
    if (!swarm) return next(new ApiError(404, "Swarm not found"));

    const { fromAgentId, topic, payload } = req.body;
    if (!fromAgentId || !topic || payload === undefined) {
      return next(new ApiError(400, "fromAgentId, topic, and payload are required"));
    }

    await swarmMessageBus.publish(req.params.swarmId, fromAgentId, topic, payload);
    res.status(201).json({ published: true });
  } catch (err) {
    next(err);
  }
});

export default router;
