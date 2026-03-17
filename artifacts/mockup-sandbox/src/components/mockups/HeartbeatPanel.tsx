import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RunStatus = "running" | "completed" | "partial_failure" | "failed";
type AgentRunStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

interface AgentRun {
  agentName: string;
  status: AgentRunStatus;
  decision: string;
  costUsd: number;
  latencyMs: number;
  error?: string;
}

interface HeartbeatRun {
  id: string;
  trigger: "manual" | "scheduled" | "event";
  status: RunStatus;
  agentsTotal: number;
  agentsSucceeded: number;
  agentsFailed: number;
  totalCostUsd: number;
  startedAt: string;
  duration: string;
  agentRuns?: AgentRun[];
}

const runs: HeartbeatRun[] = [
  {
    id: "hb-001",
    trigger: "scheduled",
    status: "running",
    agentsTotal: 6,
    agentsSucceeded: 3,
    agentsFailed: 0,
    totalCostUsd: 0.042,
    startedAt: "Just now",
    duration: "in progress",
    agentRuns: [
      { agentName: "Atlas", status: "succeeded", decision: "Review & approve goal updates", costUsd: 0.018, latencyMs: 1240 },
      { agentName: "Luna", status: "running", decision: "—", costUsd: 0, latencyMs: 0 },
      { agentName: "Kai", status: "succeeded", decision: "Continue auth service implementation", costUsd: 0.012, latencyMs: 890 },
      { agentName: "Nova", status: "queued", decision: "—", costUsd: 0, latencyMs: 0 },
      { agentName: "Sage", status: "succeeded", decision: "Submit swarm request for landing page", costUsd: 0.012, latencyMs: 760 },
      { agentName: "Echo", status: "queued", decision: "—", costUsd: 0, latencyMs: 0 },
    ],
  },
  {
    id: "hb-002",
    trigger: "scheduled",
    status: "completed",
    agentsTotal: 6,
    agentsSucceeded: 6,
    agentsFailed: 0,
    totalCostUsd: 0.087,
    startedAt: "1h ago",
    duration: "4.2s",
  },
  {
    id: "hb-003",
    trigger: "manual",
    status: "partial_failure",
    agentsTotal: 6,
    agentsSucceeded: 5,
    agentsFailed: 1,
    totalCostUsd: 0.071,
    startedAt: "2h ago",
    duration: "6.8s",
  },
  {
    id: "hb-004",
    trigger: "scheduled",
    status: "completed",
    agentsTotal: 6,
    agentsSucceeded: 6,
    agentsFailed: 0,
    totalCostUsd: 0.092,
    startedAt: "3h ago",
    duration: "3.9s",
  },
];

const runStatusConfig: Record<RunStatus, { color: string; label: string }> = {
  running: { color: "bg-blue-100 text-blue-700", label: "Running" },
  completed: { color: "bg-emerald-100 text-emerald-700", label: "Completed" },
  partial_failure: { color: "bg-amber-100 text-amber-700", label: "Partial Failure" },
  failed: { color: "bg-red-100 text-red-700", label: "Failed" },
};

const agentRunColor: Record<AgentRunStatus, string> = {
  queued: "bg-gray-100 text-gray-500",
  running: "bg-blue-100 text-blue-700",
  succeeded: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-400",
};

export default function HeartbeatPanel() {
  const latest = runs[0];

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Heartbeat</h1>
        <p className="text-sm text-muted-foreground mt-1">Periodic agent execution cycles</p>
      </div>

      {/* Current run */}
      {latest.status === "running" && latest.agentRuns && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Current Run</CardTitle>
              <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full animate-pulse">
                ● Running
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-700">{latest.agentsSucceeded}</p>
                <p className="text-xs text-muted-foreground">Succeeded</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">
                  {latest.agentsTotal - latest.agentsSucceeded - latest.agentsFailed}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{latest.agentsFailed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            <div className="space-y-2">
              {latest.agentRuns.map((ar) => (
                <div key={ar.agentName} className="flex items-center gap-3 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium w-24 text-center ${agentRunColor[ar.status]}`}>
                    {ar.status}
                  </span>
                  <span className="font-medium w-14">{ar.agentName}</span>
                  <span className="text-muted-foreground flex-1 truncate text-xs">{ar.decision || "—"}</span>
                  {ar.costUsd > 0 && (
                    <span className="text-xs text-muted-foreground">${ar.costUsd.toFixed(3)}</span>
                  )}
                  {ar.latencyMs > 0 && (
                    <span className="text-xs text-muted-foreground">{ar.latencyMs}ms</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {runs.map((run) => {
              const st = runStatusConfig[run.status];
              return (
                <div key={run.id} className="flex items-center gap-4 py-2 border-b last:border-0 text-sm">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                    {st.label}
                  </span>
                  <span className="text-muted-foreground text-xs w-20">{run.startedAt}</span>
                  <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                    {run.trigger}
                  </span>
                  <span className="flex-1 text-xs text-muted-foreground">
                    {run.agentsSucceeded}/{run.agentsTotal} agents
                    {run.agentsFailed > 0 && (
                      <span className="text-red-500 ml-1">· {run.agentsFailed} failed</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">${run.totalCostUsd.toFixed(3)}</span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{run.duration}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
