import { db, swarmMessagesTable, swarmRunsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { broadcastEvent } from '../routes/events.js';

type SwarmMessage = typeof swarmMessagesTable.$inferSelect;
type Handler = (msg: SwarmMessage) => void;

export class SwarmMessageBus {
    private subscribers = new Map<string, Set<Handler>>();

    private key(swarmId: string, topic: string) {
        return `${swarmId}:${topic}`;
    }

    async publish(
        swarmId: string,
        fromAgentId: string,
        topic: string,
        payload: unknown,
    ): Promise<void> {
        const [msg] = await db
            .insert(swarmMessagesTable)
            .values({
                id: crypto.randomUUID(),
                swarmRunId: swarmId,
                fromAgentId,
                messageType: topic as any,
                content: payload,
            })
            .returning();

        // Notify in-process subscribers (e.g., synthesis listeners)
        this.subscribers.get(this.key(swarmId, topic))?.forEach((h) => h(msg));

        // Broadcast to SSE stream for the company
        const [swarm] = await db
            .select({ companyId: swarmRunsTable.companyId })
            .from(swarmRunsTable)
            .where(eq(swarmRunsTable.id, swarmId));

        if (swarm) {
            broadcastEvent(swarm.companyId, {
                type: 'swarm.message',
                data: { swarmId, fromAgentId, topic, payload },
            });
        }
    }

    subscribe(swarmId: string, topic: string, handler: Handler): () => void {
        const key = this.key(swarmId, topic);
        if (!this.subscribers.has(key)) this.subscribers.set(key, new Set());
        this.subscribers.get(key)!.add(handler);
        return () => this.subscribers.get(key)?.delete(handler);
    }

    async getMessages(swarmId: string, topic?: string): Promise<SwarmMessage[]> {
        const conditions = [eq(swarmMessagesTable.swarmRunId, swarmId)];
        if (topic) conditions.push(eq(swarmMessagesTable.messageType, topic as any));
        return db.select().from(swarmMessagesTable).where(and(...conditions));
    }
}

export const swarmMessageBus = new SwarmMessageBus();
