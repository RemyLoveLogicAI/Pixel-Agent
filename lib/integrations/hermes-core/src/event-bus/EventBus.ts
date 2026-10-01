import type { HermesEvent, HermesEventType, HermesBus } from '../types/events.js';

type EventHandler<T = unknown> = (event: HermesEvent<T>) => void;

interface Subscription {
  handler: EventHandler;
  eventType?: HermesEventType;
  bus?: HermesBus;
}

/**
 * Typed event bus with publish/subscribe.
 * Supports filtering by event type and/or bus.
 * Events are dispatched synchronously to matching subscribers.
 */
export class EventBus {
  private subscribers: Subscription[] = [];
  private eventLog: HermesEvent[] = [];
  private maxLogSize = 1000;

  /**
   * Subscribe to events. Optionally filter by type and/or bus.
   */
  subscribe<T = unknown>(handler: EventHandler<T>, filter?: { type?: HermesEventType; bus?: HermesBus }): () => void {
    const sub: Subscription = {
      handler: handler as EventHandler,
      eventType: filter?.type,
      bus: filter?.bus,
    };
    this.subscribers.push(sub);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== sub);
    };
  }

  /**
   * Publish an event to all matching subscribers.
   * Also appends to the internal event log.
   */
  publish<T = unknown>(event: HermesEvent<T>): void {
    this.appendToLog(event as HermesEvent);

    for (const sub of this.subscribers) {
      if (sub.eventType && event.type !== sub.eventType) continue;
      if (sub.bus && event.bus !== sub.bus) continue;
      try {
        (sub.handler as EventHandler<T>)(event);
      } catch (err) {
        // Log but don't bubble — one subscriber's error shouldn't block others
        console.error(`[EventBus] handler error for ${event.type}:`, err);
      }
    }
  }

  /**
   * Get recent events from the log. Optionally filter by type.
   */
  getHistory(filter?: { type?: HermesEventType; limit?: number }): HermesEvent[] {
    const limit = filter?.limit ?? this.eventLog.length;
    let events = this.eventLog.slice(-limit);
    if (filter?.type) {
      events = events.filter((e) => e.type === filter.type);
    }
    return events;
  }

  /**
   * Clear the event log.
   */
  clearHistory(): void {
    this.eventLog = [];
  }

  private appendToLog(event: HermesEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
  }
}
