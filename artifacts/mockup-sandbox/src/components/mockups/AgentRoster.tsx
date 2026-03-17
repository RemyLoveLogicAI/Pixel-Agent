import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type AgentStatus = "idle" | "thinking" | "executing" | "waiting_approval" | "error" | "circuit_open" | "terminated";

interface Agent {
  id: string;
  name: string;
  role: string;
  title: string;
  level: number;
  status: AgentStatus;
  model: string;
  budgetMonthlyUsd: number;
  budgetUsedUsd: number;
  tools: string[];
  lastHeartbeat: string;
}

const agents: Agent[] = [
  {
    id: "1",
    name: "Atlas",
    role: "ceo",
    title: "Chief Executive Officer",
    level: 1,
    status: "idle",
    model: "claude-opus-4-6",
    budgetMonthlyUsd: 500,
    budgetUsedUsd: 210,
    tools: ["create_goal", "hire_agent", "fire_agent", "memory_read"],
    lastHeartbeat: "3m ago",
  },
  {
    id: "2",
    name: "Luna",
    role: "engineering_lead",
    title: "VP of Engineering",
    level: 2,
    status: "executing",
    model: "claude-sonnet-4-6",
    budgetMonthlyUsd: 300,
    budgetUsedUsd: 267,
    tools: ["code_execute", "file_read", "file_write", "web_search"],
    lastHeartbeat: "1m ago",
  },
  {
    id: "3",
    name: "Kai",
    role: "backend_engineer",
    title: "Senior Backend Engineer",
    level: 3,
    status: "thinking",
    model: "claude-sonnet-4-6",
    budgetMonthlyUsd: 200,
    budgetUsedUsd: 170,
    tools: ["code_execute", "db_query", "file_read", "file_write"],
    lastHeartbeat: "2m ago",
  },
  {
    id: "4",
    name: "Nova",
    role: "frontend_engineer",
    title: "Frontend Engineer",
    level: 3,
    status: "idle",
    model: "claude-haiku-4-5",
    budgetMonthlyUsd: 150,
    budgetUsedUsd: 45,
    tools: ["code_execute", "file_read", "file_write", "image_generate"],
    lastHeartbeat: "5m ago",
  },
  {
    id: "5",
    name: "Sage",
    role: "product_manager",
    title: "Product Manager",
    level: 2,
    status: "waiting_approval",
    model: "claude-sonnet-4-6",
    budgetMonthlyUsd: 250,
    budgetUsedUsd: 98,
    tools: ["create_goal", "create_task", "web_search", "memory_write"],
    lastHeartbeat: "7m ago",
  },
  {
    id: "6",
    name: "Echo",
    role: "qa_engineer",
    title: "QA Engineer",
    level: 3,
    status: "error",
    model: "claude-haiku-4-5",
    budgetMonthlyUsd: 120,
    budgetUsedUsd: 30,
    tools: ["code_execute", "file_read", "web_fetch"],
    lastHeartbeat: "12m ago",
  },
];

const statusConfig: Record<AgentStatus, { label: string; color: string; dot: string }> = {
  idle: { label: "Idle", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  thinking: { label: "Thinking", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500 animate-pulse" },
  executing: { label: "Executing", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500 animate-pulse" },
  waiting_approval: { label: "Awaiting Approval", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  error: { label: "Error", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  circuit_open: { label: "Circuit Open", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  terminated: { label: "Terminated", color: "bg-gray-100 text-gray-400", dot: "bg-gray-300" },
};

const levelLabel: Record<number, string> = { 1: "L1", 2: "L2", 3: "L3", 4: "L4" };

export default function AgentRoster() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agent Roster</h1>
        <p className="text-sm text-muted-foreground mt-1">{agents.length} agents · {agents.filter(a => a.status !== "idle" && a.status !== "terminated").length} active</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const st = statusConfig[agent.status];
          const util = Math.round((agent.budgetUsedUsd / agent.budgetMonthlyUsd) * 100);
          return (
            <Card key={agent.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{agent.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {levelLabel[agent.level] ?? `L${agent.level}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{agent.title}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${st.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border">{agent.model}</span>
                  <span>Heartbeat {agent.lastHeartbeat}</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Budget</span>
                    <span className={util > 85 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      ${agent.budgetUsedUsd} / ${agent.budgetMonthlyUsd} ({util}%)
                    </span>
                  </div>
                  <Progress
                    value={util}
                    className={`h-1.5 ${util > 85 ? "[&>div]:bg-red-500" : util > 65 ? "[&>div]:bg-amber-500" : ""}`}
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {agent.tools.slice(0, 3).map((t) => (
                    <span key={t} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                  {agent.tools.length > 3 && (
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                      +{agent.tools.length - 3} more
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
