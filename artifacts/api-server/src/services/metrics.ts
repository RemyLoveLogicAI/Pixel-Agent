/**
 * Lightweight Prometheus-compatible metrics for swarm orchestration.
 *
 * No external dependencies — counters and gauges are tracked in-memory
 * and serialised to Prometheus text exposition format on demand.
 */

interface Counter {
  name: string;
  help: string;
  labels: Map<string, number>;
}

interface Gauge {
  name: string;
  help: string;
  labels: Map<string, number>;
}

interface Histogram {
  name: string;
  help: string;
  buckets: number[];
  observations: Map<string, { counts: number[]; sum: number; count: number }>;
}

class MetricsRegistry {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, Histogram>();

  counter(name: string, help: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, { name, help, labels: new Map() });
    }
    return this.counters.get(name)!;
  }

  gauge(name: string, help: string): Gauge {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { name, help, labels: new Map() });
    }
    return this.gauges.get(name)!;
  }

  histogram(name: string, help: string, buckets: number[]): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, { name, help, buckets, observations: new Map() });
    }
    return this.histograms.get(name)!;
  }

  inc(counter: Counter, labels: Record<string, string> = {}, value = 1): void {
    const key = labelKey(labels);
    counter.labels.set(key, (counter.labels.get(key) ?? 0) + value);
  }

  set(gauge: Gauge, labels: Record<string, string>, value: number): void {
    gauge.labels.set(labelKey(labels), value);
  }

  observe(histogram: Histogram, labels: Record<string, string>, value: number): void {
    const key = labelKey(labels);
    if (!histogram.observations.has(key)) {
      histogram.observations.set(key, {
        counts: new Array(histogram.buckets.length + 1).fill(0),
        sum: 0,
        count: 0,
      });
    }
    const obs = histogram.observations.get(key)!;
    obs.sum += value;
    obs.count += 1;
    for (let i = 0; i < histogram.buckets.length; i++) {
      if (value <= histogram.buckets[i]) obs.counts[i]++;
    }
    obs.counts[histogram.buckets.length]++; // +Inf bucket
  }

  serialise(): string {
    const lines: string[] = [];

    for (const c of this.counters.values()) {
      lines.push(`# HELP ${c.name} ${c.help}`);
      lines.push(`# TYPE ${c.name} counter`);
      for (const [lbl, val] of c.labels) {
        lines.push(`${c.name}${lbl ? `{${lbl}}` : ""} ${val}`);
      }
    }

    for (const g of this.gauges.values()) {
      lines.push(`# HELP ${g.name} ${g.help}`);
      lines.push(`# TYPE ${g.name} gauge`);
      for (const [lbl, val] of g.labels) {
        lines.push(`${g.name}${lbl ? `{${lbl}}` : ""} ${val}`);
      }
    }

    for (const h of this.histograms.values()) {
      lines.push(`# HELP ${h.name} ${h.help}`);
      lines.push(`# TYPE ${h.name} histogram`);
      for (const [lbl, obs] of h.observations) {
        const prefix = lbl ? `,${lbl}` : "";
        for (let i = 0; i < h.buckets.length; i++) {
          lines.push(`${h.name}_bucket{le="${h.buckets[i]}"${prefix}} ${obs.counts[i]}`);
        }
        lines.push(`${h.name}_bucket{le="+Inf"${prefix}} ${obs.counts[h.buckets.length]}`);
        lines.push(`${h.name}_sum{${lbl}} ${obs.sum}`);
        lines.push(`${h.name}_count{${lbl}} ${obs.count}`);
      }
    }

    return lines.join("\n") + "\n";
  }
}

function labelKey(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}="${v}"`).join(",");
}

// ── Singleton registry ─────────────────────────────────────────────────────

export const registry = new MetricsRegistry();

// ── Swarm metrics ──────────────────────────────────────────────────────────

export const swarmProposed = registry.counter(
  "pixel_swarm_proposed_total",
  "Total number of swarms proposed",
);

export const swarmCompleted = registry.counter(
  "pixel_swarm_completed_total",
  "Total number of swarms that reached a terminal phase",
);

export const swarmAgentsExecuted = registry.counter(
  "pixel_swarm_agents_executed_total",
  "Total swarm agent executions",
);

export const swarmDuration = registry.histogram(
  "pixel_swarm_duration_seconds",
  "End-to-end swarm lifecycle duration in seconds",
  [1, 5, 10, 30, 60, 120, 300],
);

export const swarmCostUsd = registry.counter(
  "pixel_swarm_cost_usd_total",
  "Cumulative swarm cost in USD",
);

// ── Heartbeat metrics ──────────────────────────────────────────────────────

export const heartbeatTicks = registry.counter(
  "pixel_heartbeat_ticks_total",
  "Total heartbeat scheduler ticks",
);

export const heartbeatAgentRuns = registry.counter(
  "pixel_heartbeat_agent_runs_total",
  "Total heartbeat agent executions by outcome",
);

export const heartbeatDlqEntries = registry.counter(
  "pixel_heartbeat_dlq_entries_total",
  "Total dead-letter queue entries created",
);

// ── Circuit breaker metrics ────────────────────────────────────────────────

export const circuitBreakerTrips = registry.counter(
  "pixel_circuit_breaker_trips_total",
  "Number of times a circuit breaker tripped to open",
);

// ── Agent pool metrics ─────────────────────────────────────────────────────

export const poolActiveWorkers = registry.gauge(
  "pixel_pool_active_workers",
  "Current number of active agent pool workers",
);
