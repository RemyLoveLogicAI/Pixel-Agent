/**
 * Agent Pool for managing concurrent agent execution with structured concurrency.
 */
export class AgentPool {
    private maxConcurrent: number;
    private timeoutMs: number;

    constructor(maxConcurrent: number = 10, timeoutMs: number = 30000) {
        this.maxConcurrent = maxConcurrent;
        this.timeoutMs = timeoutMs;
    }

    /**
     * Map function that processes items with controlled concurrency.
     * @param items Array of items to process
     * @param processor Async function to process each item
     * @param options Options for concurrency and timeout
     * @returns Promise that resolves to an array of results (null for failed items)
     */
    async map<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        options: { concurrency?: number; timeout?: number } = {}
    ): Promise<(R | null)[]> {
        const concurrency = options.concurrency ?? this.maxConcurrent;
        const timeout = options.timeout ?? this.timeoutMs;

        const results: Array<R | null> = Array(items.length).fill(null);
        let index = 0;

        const worker = async (): Promise<void> => {
            while (true) {
                const itemIndex = index++;
                if (itemIndex >= items.length) {
                    break;
                }
                const item = items[itemIndex];

                try {
                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), timeout)
                    );
                    const result = await Promise.race([
                        processor(item),
                        timeoutPromise,
                    ]) as R;
                    results[itemIndex] = result;
                } catch (error) {
                    results[itemIndex] = null;
                    console.error(`Error processing item at index ${itemIndex}:`, error);
                }
            }
        };

        // Start workers up to concurrency limit
        const workers: Promise<void>[] = [];
        for (let i = 0; i < Math.min(concurrency, items.length); i++) {
            workers.push(worker());
        }

        await Promise.all(workers);

        return results;
    }
}
