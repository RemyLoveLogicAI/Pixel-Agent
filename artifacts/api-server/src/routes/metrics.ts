import { Router, type IRouter } from "express";
import { registry } from "../services/metrics.js";

const router: IRouter = Router();

/**
 * Prometheus-compatible metrics endpoint.
 * Returns all registered counters, gauges, and histograms
 * in Prometheus text exposition format.
 */
router.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(registry.serialise());
});

export default router;
