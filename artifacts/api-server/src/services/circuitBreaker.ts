/**
 * Circuit Breaker pattern implementation for agent fault tolerance.
 */
export class CircuitBreaker {
    private failureThreshold: number;
    private failureCount: number;
    private lastFailureTime: number | null;
    private timeoutMs: number;
    private state: 'closed' | 'open' | 'half-open';

    constructor(failureThreshold: number = 3, timeoutMs: number = 60000) {
        this.failureThreshold = failureThreshold;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.timeoutMs = timeoutMs;
        this.state = 'closed';
    }

    /**
     * Records a successful execution.
     */
    recordSuccess(): void {
        this.failureCount = 0;
        this.state = 'closed';
    }

    /**
     * Records a failed execution.
     */
    recordFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'open';
        }
    }

    /**
     * Checks if the circuit breaker is open.
     * @returns true if the circuit is open (failing), false otherwise
     */
    isOpen(): boolean {
        if (this.state === 'open') {
            // Check if timeout has passed to allow half-open state
            if (
                this.lastFailureTime !== null &&
                Date.now() - this.lastFailureTime > this.timeoutMs
            ) {
                this.state = 'half-open';
                return false; // Allow one trial request
            }
            return true;
        }
        return false;
    }

    /**
     * Gets the current state of the circuit breaker.
     */
    getState(): 'closed' | 'open' | 'half-open' {
        return this.state;
    }
}
