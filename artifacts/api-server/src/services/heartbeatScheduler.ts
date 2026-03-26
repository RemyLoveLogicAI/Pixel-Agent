import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { heartbeatRunner } from "./heartbeatRunner.js";

/**
 * HeartbeatScheduler: polls all active companies on a fixed interval
 * and fires scheduled heartbeat runs for agents that are due.
 *
 * Designed as a singleton — call start() once at server startup.
 */
export class HeartbeatScheduler {
    private intervalMs: number;
    private timer: ReturnType<typeof setInterval> | null = null;
    private running = false;
    private lastTickAt: Date | null = null;
    private tickCount = 0;

    constructor(intervalMs = 60_000) {
        this.intervalMs = intervalMs;
    }

    get isRunning(): boolean {
        return this.running;
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.timer = setInterval(() => this.tick(), this.intervalMs);
        console.log(`[HeartbeatScheduler] started (interval: ${this.intervalMs}ms)`);
    }

    stop(): void {
        if (!this.running) return;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.running = false;
        console.log(`[HeartbeatScheduler] stopped after ${this.tickCount} ticks`);
    }

    status(): { running: boolean; intervalMs: number; lastTickAt: string | null; tickCount: number } {
        return {
            running: this.running,
            intervalMs: this.intervalMs,
            lastTickAt: this.lastTickAt?.toISOString() ?? null,
            tickCount: this.tickCount,
        };
    }

    /** Trigger an immediate tick for all active companies (also usable from tests). */
    async tick(): Promise<void> {
        this.lastTickAt = new Date();
        this.tickCount++;

        let companies: typeof companiesTable.$inferSelect[] = [];
        try {
            companies = await db
                .select()
                .from(companiesTable)
                .where(eq(companiesTable.status, "active"));
        } catch (err) {
            console.error("[HeartbeatScheduler] failed to load companies:", err);
            return;
        }

        // Fire heartbeats concurrently per company (they are isolated)
        await Promise.allSettled(
            companies.map(async (c) => {
                try {
                    await heartbeatRunner.runHeartbeat(c.id, "scheduled");
                } catch (err) {
                    console.error(`[HeartbeatScheduler] company ${c.id} heartbeat error:`, err);
                }
            }),
        );
    }
}

export const heartbeatScheduler = new HeartbeatScheduler();
