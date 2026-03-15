/**
 * Agent Pool: bounded concurrency for parallel agent execution.
 *
 * Intentionally does NOT handle timeouts or error swallowing — those are
 * the caller's responsibility. Each processor function must catch its own
 * errors and return a result; unhandled rejections will propagate and abort
 * the pool (fail-fast for programming errors).
 */
export class AgentPool {
    private maxConcurrent: number;

    constructor(maxConcurrent: number = 10, _deprecatedTimeoutMs?: number) {
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Process `items` concurrently with at most `maxConcurrent` workers.
     * The processor MUST NOT throw — wrap failures in a result object.
     */
    async map<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        options: { concurrency?: number } = {},
    ): Promise<R[]> {
        if (items.length === 0) return [];

        const concurrency = Math.min(options.concurrency ?? this.maxConcurrent, items.length);
        const results: R[] = Array(items.length);
        let nextIndex = 0;

        const worker = async (): Promise<void> => {
            while (true) {
                const i = nextIndex++;
                if (i >= items.length) break;
                results[i] = await processor(items[i]);
            }
        };

        await Promise.all(
            Array.from({ length: concurrency }, () => worker()),
        );

        return results;
    }
}
