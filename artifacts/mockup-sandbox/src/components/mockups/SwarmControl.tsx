import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SwarmPhase =
  | "proposed"
  | "pending_approval"
  | "spawning"
  | "executing"
  | "synthesizing"
  | "completed"
  | "failed"
  | "cancelled";

type AgentStatus = "spawned" | "executing" | "completed" | "failed";

interface SwarmAgent {
  id: string;
  role: string;
  model: string;
  status: AgentStatus;
  output?: string;
  costUsd?: number;
}

interface Message {
  from: string;
  to?: string;
  type: "finding" | "question" | "dependency" | "partial_result";
  content: string;
  time: string;
}

interface Swarm {
  id: string;
  taskDescription: string;
  phase: SwarmPhase;
  leaderAgent: string;
  maxAgents: number;
  totalCostUsd: number;
  createdAt: string;
  agents: SwarmAgent[];
  messages: Message[];
}

const swarm: Swarm = {
  id: "swarm-001",
  taskDescription: "Build Q2 marketing landing page with hero section, feature grid, testimonials, and CTA.",
  phase: "executing",
  leaderAgent: "Sage",
  maxAgents: 4,
  totalCostUsd: 0.32,
  createdAt: "8m ago",
  agents: [
    { id: "sa1", role: "Copywriter", model: "claude-sonnet-4-6", status: "completed", output: "Hero headline: 'Build smarter. Ship faster. With AI.'", costUsd: 0.08 },
    { id: "sa2", role: "UI Designer", model: "claude-sonnet-4-6", status: "executing", costUsd: 0.12 },
    { id: "sa3", role: "Frontend Dev", model: "claude-sonnet-4-6", status: "spawned", costUsd: 0 },
    { id: "sa4", role: "SEO Specialist", model: "claude-haiku-4-5", status: "executing", costUsd: 0.04 },
  ],
  messages: [
    { from: "Copywriter", type: "finding", content: "Target audience: technical founders. Tone: confident, direct.", time: "6m ago" },
    { from: "SEO Specialist", to: "Copywriter", type: "question", content: "What keywords should we prioritize for H1?", time: "5m ago" },
    { from: "Copywriter", type: "partial_result", content: "Hero copy complete. Keywords: autonomous agents, AI company, ship 10x faster.", time: "4m ago" },
    { from: "UI Designer", type: "dependency", content: "Waiting on final copy before building component layouts.", time: "3m ago" },
  ],
};

const phaseConfig: Record<SwarmPhase, { color: string; label: string; step: number }> = {
  proposed: { color: "bg-gray-100 text-gray-600", label: "Proposed", step: 1 },
  pending_approval: { color: "bg-amber-100 text-amber-700", label: "Pending Approval", step: 2 },
  spawning: { color: "bg-blue-100 text-blue-700", label: "Spawning", step: 3 },
  executing: { color: "bg-emerald-100 text-emerald-700", label: "Executing", step: 4 },
  synthesizing: { color: "bg-purple-100 text-purple-700", label: "Synthesizing", step: 5 },
  completed: { color: "bg-emerald-100 text-emerald-700", label: "Completed", step: 6 },
  failed: { color: "bg-red-100 text-red-700", label: "Failed", step: 0 },
  cancelled: { color: "bg-gray-100 text-gray-500", label: "Cancelled", step: 0 },
};

const agentStatusColor: Record<AgentStatus, string> = {
  spawned: "bg-gray-100 text-gray-500",
  executing: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

const msgTypeIcon: Record<string, string> = {
  finding: "💡",
  question: "❓",
  dependency: "🔗",
  partial_result: "📦",
};

const phases: SwarmPhase[] = ["proposed", "pending_approval", "spawning", "executing", "synthesizing", "completed"];

export default function SwarmControl() {
  const currentPhase = phaseConfig[swarm.phase];
  const currentStep = currentPhase.step;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Swarm Control</h1>
        <p className="text-sm text-muted-foreground mt-1">Active swarm · {swarm.createdAt}</p>
      </div>

      {/* Phase timeline */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            {phases.map((phase, i) => {
              const pc = phaseConfig[phase];
              const isActive = phase === swarm.phase;
              const isDone = pc.step < currentStep;
              return (
                <div key={phase} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center flex-shrink-0`}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : isDone
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isDone ? "✓" : pc.step}
                    </div>
                    <span className={`text-xs mt-1 text-center max-w-[70px] leading-tight ${isActive ? "font-semibold text-blue-700" : isDone ? "text-emerald-700" : "text-gray-400"}`}>
                      {pc.label}
                    </span>
                  </div>
                  {i < phases.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${isDone ? "bg-emerald-400" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Task & meta */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Task</p>
              <p className="text-sm font-medium">{swarm.taskDescription}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-muted-foreground">Cost so far</p>
              <p className="text-lg font-bold">${swarm.totalCostUsd.toFixed(3)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Leader: {swarm.leaderAgent} · {swarm.agents.length}/{swarm.maxAgents} agents</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Agent statuses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Swarm Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {swarm.agents.map((agent) => (
                <div key={agent.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${agentStatusColor[agent.status]}`}>
                        {agent.status}
                      </span>
                      <span className="text-sm font-medium">{agent.role}</span>
                    </div>
                    {agent.costUsd !== undefined && agent.costUsd > 0 && (
                      <span className="text-xs text-muted-foreground">${agent.costUsd.toFixed(3)}</span>
                    )}
                  </div>
                  {agent.output && (
                    <p className="text-xs text-muted-foreground ml-14 italic">{agent.output}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inter-Agent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {swarm.messages.map((msg, i) => (
                <div key={i} className="text-sm border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    <span>{msgTypeIcon[msg.type]}</span>
                    <span className="font-medium text-foreground">{msg.from}</span>
                    {msg.to && <><span>→</span><span className="font-medium text-foreground">{msg.to}</span></>}
                    <span className="ml-auto">{msg.time}</span>
                  </div>
                  <p className="text-xs text-gray-700">{msg.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
