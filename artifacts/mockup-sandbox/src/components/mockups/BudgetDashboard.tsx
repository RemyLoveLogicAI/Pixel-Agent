import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AgentBudget {
  name: string;
  role: string;
  monthlyUsd: number;
  usedUsd: number;
  status: "ok" | "warning" | "critical";
}

const agentBudgets: AgentBudget[] = [
  { name: "Atlas", role: "CEO", monthlyUsd: 500, usedUsd: 210, status: "ok" },
  { name: "Luna", role: "VP Engineering", monthlyUsd: 300, usedUsd: 267, status: "critical" },
  { name: "Kai", role: "Backend Engineer", monthlyUsd: 200, usedUsd: 170, status: "warning" },
  { name: "Sage", role: "Product Manager", monthlyUsd: 250, usedUsd: 98, status: "ok" },
  { name: "Nova", role: "Frontend Engineer", monthlyUsd: 150, usedUsd: 45, status: "ok" },
  { name: "Echo", role: "QA Engineer", monthlyUsd: 120, usedUsd: 30, status: "ok" },
];

const alerts = [
  { type: "hard_cap", agent: "Luna", message: "Luna has used 89% of monthly budget", time: "2h ago" },
  { type: "soft_limit", agent: "Kai", message: "Kai approaching 85% budget threshold", time: "3h ago" },
  { type: "projected_overrun", agent: "Luna", message: "Luna projected to exceed budget by end of month", time: "5h ago" },
];

const alertIcon: Record<string, string> = {
  hard_cap: "🔴",
  soft_limit: "🟡",
  circuit_breaker: "⚡",
  projected_overrun: "📈",
};

function progressColor(pct: number) {
  if (pct >= 85) return "[&>div]:bg-red-500";
  if (pct >= 65) return "[&>div]:bg-amber-500";
  return "";
}

export default function BudgetDashboard() {
  const totalMonthly = agentBudgets.reduce((s, a) => s + a.monthlyUsd, 0);
  const totalUsed = agentBudgets.reduce((s, a) => s + a.usedUsd, 0);
  const companyMonthly = 5000;
  const companyUsed = 1840;
  const companyPct = Math.round((companyUsed / companyMonthly) * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
        <p className="text-sm text-muted-foreground mt-1">March 2026 · Pixel Labs Inc.</p>
      </div>

      {/* Company budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly limit</span>
            <span className="font-bold text-lg">${companyMonthlyUsd.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Used</span>
            <span>${companyUsed.toLocaleString()} ({companyPct}%)</span>
          </div>
          <Progress value={companyPct} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Agent budgets total: ${totalMonthly.toLocaleString()} / mo</span>
            <span>${(companyMonthly - companyUsed).toLocaleString()} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-agent breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Agent Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agentBudgets.map((agent) => {
              const pct = Math.round((agent.usedUsd / agent.monthlyUsd) * 100);
              return (
                <div key={agent.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{agent.name}</span>
                      <span className="text-xs text-muted-foreground">{agent.role}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${pct >= 85 ? "text-red-600" : pct >= 65 ? "text-amber-600" : "text-gray-700"}`}>
                        ${agent.usedUsd}
                      </span>
                      <span className="text-xs text-muted-foreground"> / ${agent.monthlyUsd}</span>
                    </div>
                  </div>
                  <Progress value={pct} className={`h-2 ${progressColor(pct)}`} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                    <span>{pct}% used</span>
                    <span>${agent.monthlyUsd - agent.usedUsd} left</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base text-amber-700">Budget Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span>{alertIcon[alert.type]}</span>
                  <div className="flex-1">
                    <p className="text-gray-700">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const companyMonthlyUsd = 5000;
