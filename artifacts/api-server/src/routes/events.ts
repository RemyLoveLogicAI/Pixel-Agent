import { Router } from "express";

// In-memory SSE subscriber registry keyed by companyId
const subscribers = new Map<string, Set<(data: string) => void>>();

export function broadcastEvent(companyId: string, event: { type: string; data: unknown }) {
  const subs = subscribers.get(companyId);
  if (!subs) return;
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  for (const send of subs) {
    try {
      send(payload);
    } catch {
      // subscriber gone
    }
  }
}

const router = Router();

router.get("/companies/:companyId/events", (req, res) => {
  const { companyId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ companyId })}\n\n`);

  // Heartbeat ping every 30s to keep connection alive
  const ping = setInterval(() => {
    res.write(": ping\n\n");
  }, 30_000);

  const send = (data: string) => res.write(data);

  if (!subscribers.has(companyId)) {
    subscribers.set(companyId, new Set());
  }
  subscribers.get(companyId)!.add(send);

  req.on("close", () => {
    clearInterval(ping);
    subscribers.get(companyId)?.delete(send);
    if (subscribers.get(companyId)?.size === 0) {
      subscribers.delete(companyId);
    }
  });
});

export default router;
