import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Brain,
  Gavel,
  Gauge,
  Network,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const kpis = [
  { label: "Active Agents", value: "128", delta: "+12", icon: Users },
  { label: "Heartbeat SLA", value: "99.2%", delta: "+0.4%", icon: Timer },
  { label: "Budget Utilization", value: "68%", delta: "-4%", icon: Gauge },
  { label: "Governance Queue", value: "7", delta: "+2", icon: Gavel },
];

const governance = [
  {
    title: "Swarm approval for Goal: Q3 Runtime Hardening",
    level: "High",
    owner: "CEO",
    eta: "11m",
  },
  { title: "Tool access: code_exec for Agent Vela", level: "Medium", owner: "CISO", eta: "26m" },
  { title: "Escalation: IC → Manager for Model swap", level: "Low", owner: "CTO", eta: "41m" },
];

const swarms = [
  { name: "Reliability Sprint", stage: "Execute", progress: 62, lead: "Manager Theta" },
  { name: "Agent Market Map", stage: "Synthesize", progress: 84, lead: "Director Nova" },
  { name: "Budget Forecast", stage: "Spawn", progress: 28, lead: "VP Orion" },
];

const heartbeatLanes = [
  { name: "Executive", ok: 6, warn: 1, fail: 0 },
  { name: "Managers", ok: 18, warn: 2, fail: 1 },
  { name: "ICs", ok: 74, warn: 6, fail: 2 },
];

const delegationRoutes = [
  { from: "Board", to: "CEO", risk: "locked" },
  { from: "CEO", to: "VPs", risk: "guarded" },
  { from: "VPs", to: "Managers", risk: "guarded" },
  { from: "Managers", to: "ICs", risk: "open" },
];

const budgets = [
  { label: "Per-call soft limit", value: 42, cap: "$0.18" },
  { label: "Per-agent hard cap", value: 68, cap: "$420" },
  { label: "Company circuit breaker", value: 74, cap: "$62K" },
];

const riskTone: Record<string, string> = {
  High: "bg-rose-100 text-rose-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

const gateTone: Record<string, string> = {
  locked: "bg-slate-900 text-white",
  guarded: "bg-blue-100 text-blue-700",
  open: "bg-emerald-100 text-emerald-700",
};

export default function OrchestrationHQ() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@500;600;700&display=swap');`}</style>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute top-1/2 -left-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 px-6 py-8 lg:px-10" style={{ fontFamily: "'Open Sans', sans-serif" }}>
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg shadow-blue-500/20">
                  <Network className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Executive Command</p>
                  <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Orchestration HQ
                  </h1>
                </div>
              </div>
              <p className="max-w-xl text-sm text-slate-300">
                Coordinate the autonomous workforce with hardened delegation paths, live heartbeat health, and governance oversight.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-200">Circuit Breaker: Closed</Badge>
                <Badge className="bg-blue-500/20 text-blue-200">Budget Safe Mode</Badge>
                <Badge className="bg-white/10 text-slate-200">SLA Target 30s</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-slate-900 hover:bg-slate-200">Launch Swarm</Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Review Governance
              </Button>
            </div>
          </header>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{kpi.label}</p>
                      <p className="mt-2 text-3xl font-semibold" style={{ fontFamily: "'Poppins', sans-serif" }}>
                        {kpi.value}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <kpi.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-emerald-200">
                    <ArrowUpRight className="h-4 w-4" />
                    {kpi.delta} this week
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Delegation Map</CardTitle>
                  <p className="text-xs text-slate-300">Capability token enforcement by chain of command</p>
                </div>
                <Badge className="bg-white/10 text-slate-200">Strict Mode</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {delegationRoutes.map((route) => (
                  <div
                    key={route.from}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-4 transition hover:border-white/30 cursor-pointer"
                  >
                    <div>
                      <p className="text-sm text-slate-200">{route.from}</p>
                      <p className="text-xs text-slate-400">Delegates to {route.to}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${gateTone[route.risk]}`}>
                      {route.risk}
                    </span>
                  </div>
                ))}
                <div className="rounded-xl border border-white/10 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-200" />
                    <p className="text-sm text-slate-200">Capability tokens validated on every delegation hop.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Governance Queue</CardTitle>
                <p className="text-xs text-slate-300">Approvals required for high-risk actions</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {governance.map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-100">{item.title}</p>
                      <Badge className={riskTone[item.level]}>{item.level}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Owner: {item.owner}</span>
                      <span>ETA {item.eta}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-200">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Swarm Lifecycle</CardTitle>
                <p className="text-xs text-slate-300">Propose → Approve → Spawn → Execute → Synthesize → Dissolve</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {swarms.map((swarm) => (
                  <div key={swarm.name} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-100">{swarm.name}</p>
                        <p className="text-xs text-slate-400">Lead: {swarm.lead}</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-200">{swarm.stage}</Badge>
                    </div>
                    <div className="mt-3">
                      <Progress value={swarm.progress} className="h-2" />
                      <p className="mt-2 text-xs text-slate-400">{swarm.progress}% complete</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Heartbeat Health</CardTitle>
                <p className="text-xs text-slate-300">Live agent status per tier</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {heartbeatLanes.map((lane) => (
                  <div key={lane.name} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-200">{lane.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-emerald-300">
                          <BadgeCheck className="h-3 w-3" /> {lane.ok}
                        </span>
                        <span className="flex items-center gap-1 text-amber-300">
                          <Activity className="h-3 w-3" /> {lane.warn}
                        </span>
                        <span className="flex items-center gap-1 text-rose-300">
                          <Brain className="h-3 w-3" /> {lane.fail}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                      <div className="rounded-md bg-emerald-500/20 px-2 py-1 text-center">OK</div>
                      <div className="rounded-md bg-amber-500/20 px-2 py-1 text-center">Warn</div>
                      <div className="rounded-md bg-rose-500/20 px-2 py-1 text-center">Fail</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Budget Guardrails</CardTitle>
                <p className="text-xs text-slate-300">Three-tier enforcement with soft limits</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {budgets.map((budget) => (
                  <div key={budget.label} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-200">{budget.label}</p>
                      <span className="text-xs text-slate-400">{budget.cap}</span>
                    </div>
                    <div className="mt-3">
                      <Progress value={budget.value} className="h-2" />
                      <p className="mt-2 text-xs text-slate-400">{budget.value}% of limit reached</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-white/10 bg-gradient-to-r from-amber-500/20 to-rose-500/20 p-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-200" />
                    <p className="text-sm text-slate-200">Automatic throttling engages at 80% utilization.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
