import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const company = {
  name: "Pixel Labs Inc.",
  mission: "Build autonomous software companies that ship products 10× faster than humans.",
  status: "active" as const,
  budgetMonthlyUsd: 5000,
  budgetUsedUsd: 1840,
  circuitBreaker: "closed" as const,
  agents: 8,
  activeGoals: 5,
  pendingTasks: 12,
  runningSwarms: 1,
};

const stats = [
  { label: "Active Agents", value: company.agents, icon: "🤖", color: "text-blue-600" },
  { label: "Active Goals", value: company.activeGoals, icon: "🎯", color: "text-emerald-600" },
  { label: "Pending Tasks", value: company.pendingTasks, icon: "📋", color: "text-amber-600" },
  { label: "Running Swarms", value: company.runningSwarms, icon: "🌀", color: "text-purple-600" },
];

const recentActivity = [
  { time: "2m ago", event: "Agent Luna completed task: Refactor auth module", type: "success" },
  { time: "8m ago", event: "Swarm launched for Goal: Q2 Landing Page", type: "info" },
  { time: "15m ago", event: "Governance request pending: Hire DevOps agent", type: "warning" },
  { time: "32m ago", event: "Heartbeat cycle completed — 6/6 agents succeeded", type: "success" },
  { time: "1h ago", event: "Budget alert: Agent Kai at 85% monthly budget", type: "warning" },
];

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-600",
};

const cbColor: Record<string, string> = {
  closed: "bg-green-100 text-green-700",
  open: "bg-red-100 text-red-700",
  half_open: "bg-orange-100 text-orange-700",
};

const activityColor: Record<string, string> = {
  success: "border-l-emerald-400",
  info: "border-l-blue-400",
  warning: "border-l-amber-400",
};

export default function CompanyDashboard() {
  const utilPct = Math.round((company.budgetUsedUsd / company.budgetMonthlyUsd) * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[company.status]}`}>
              {company.status}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cbColor[company.circuitBreaker]}`}>
              CB: {company.circuitBreaker}
            </span>
          </div>
          <p className="text-sm text-gray-500 max-w-xl">{company.mission}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <span className="text-3xl">{s.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className="font-medium">
                ${company.budgetUsedUsd.toLocaleString()} / ${company.budgetMonthlyUsd.toLocaleString()}
              </span>
            </div>
            <Progress value={utilPct} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{utilPct}% utilized</span>
              <span>${(company.budgetMonthlyUsd - company.budgetUsedUsd).toLocaleString()} remaining</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.map((a, i) => (
                <div
                  key={i}
                  className={`border-l-2 pl-3 py-0.5 ${activityColor[a.type]}`}
                >
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                  <p className="text-sm">{a.event}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
