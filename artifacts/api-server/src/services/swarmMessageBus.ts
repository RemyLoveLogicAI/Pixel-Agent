import { db, swarmMessagesTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

type SwarmMessage = typeof swarmMessagesTable.$inferSelect;
type Handler = (msg: SwarmMessage) => void;

export class SwarmMessageBus {
    private subscribers = new Map<string, Set<Handler>>();

    private key(swarmId: string, topic: string) {
        return `${swarmId}:${topic}`;
    }

    async publish(swarmId: string, fromAgentId: string, topic: string, payload: unknown): Promise<void> {
        const [msg] = await db
            .insert(swarmMessagesTable)
            .values({
                id: uuidv4(),
                swarmRunId: swarmId,
                fromAgentId,
                messageType: topic as any,
                content: payload,
            })
            .returning();

        const handlers = this.subscribers.get(this.key(swarmId, topic));
        handlers?.forEach((h) => h(msg));
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
