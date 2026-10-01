import type { Request, Response } from 'express';

// In-memory SSE subscriber registry keyed by companyId
const subscribers = new Map<string, Set<(data: string) => void>>();

/**
 * Broadcast a Hermes event to all SSE subscribers for a company.
 */
export function broadcastHermesEvent(
  companyId: string,
  event: { type: string; data: unknown },
): void {
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

/**
 * Get the number of active SSE subscribers for a company.
 */
export function getSubscriberCount(companyId: string): number {
  return subscribers.get(companyId)?.size ?? 0;
}

/**
 * SSE handler for Hermes events.
 * Clients connect to /companies/:companyId/hermes/events to receive real-time pet state changes.
 */
export function hermesSSEHandler(req: Request, res: Response): void {
  const companyId = req.params.companyId as string;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ companyId })}\n\n`);

  // Heartbeat ping every 30s to keep connection alive
  const ping = setInterval(() => {
    res.write(': ping\n\n');
  }, 30_000);

  const send = (data: string) => res.write(data);

  if (!subscribers.has(companyId)) {
    subscribers.set(companyId, new Set());
  }
  subscribers.get(companyId)!.add(send);

  req.on('close', () => {
    clearInterval(ping);
    subscribers.get(companyId)?.delete(send);
    if (subscribers.get(companyId)?.size === 0) {
      subscribers.delete(companyId);
    }
  });
}
