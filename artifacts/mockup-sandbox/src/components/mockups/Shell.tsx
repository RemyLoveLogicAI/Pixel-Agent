import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  GitBranch,
  Target,
  ClipboardList,
  Waves,
  Activity,
  Shield,
  Wallet,
  ChevronRight,
  Circle,
  Moon,
  Sun,
  Bell,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import CompanyDashboard from "./CompanyDashboard";
import AgentRoster from "./AgentRoster";
import OrgChart from "./OrgChart";
import GoalsTree from "./GoalsTree";
import TaskBoard from "./TaskBoard";
import SwarmControl from "./SwarmControl";
import HeartbeatPanel from "./HeartbeatPanel";
import GovernanceQueue from "./GovernanceQueue";
import BudgetDashboard from "./BudgetDashboard";

type ScreenId =
  | "overview"
  | "agents"
  | "orgchart"
  | "goals"
  | "tasks"
  | "swarms"
  | "heartbeat"
  | "governance"
  | "budget";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
  group: "command" | "workforce" | "operations" | "controls";
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview",    label: "Overview",    icon: Building2,     group: "command" },
  { id: "agents",      label: "Agents",      icon: Users,         badge: "8",  badgeVariant: "secondary", group: "workforce" },
  { id: "orgchart",    label: "Org Chart",   icon: GitBranch,     group: "workforce" },
  { id: "goals",       label: "Goals",       icon: Target,        badge: "5",  badgeVariant: "secondary", group: "operations" },
  { id: "tasks",       label: "Tasks",       icon: ClipboardList, badge: "12", badgeVariant: "secondary", group: "operations" },
  { id: "swarms",      label: "Swarms",      icon: Waves,         badge: "1",  badgeVariant: "default",   group: "operations" },
  { id: "heartbeat",   label: "Heartbeat",   icon: Activity,      group: "operations" },
  { id: "governance",  label: "Governance",  icon: Shield,        badge: "3",  badgeVariant: "destructive", group: "controls" },
  { id: "budget",      label: "Budget",      icon: Wallet,        group: "controls" },
];

const GROUP_LABELS: Record<NavItem["group"], string> = {
  command:    "Command",
  workforce:  "Workforce",
  operations: "Operations",
  controls:   "Controls",
};

const SCREEN_MAP: Record<ScreenId, React.ComponentType> = {
  overview:   CompanyDashboard,
  agents:     AgentRoster,
  orgchart:   OrgChart,
  goals:      GoalsTree,
  tasks:      TaskBoard,
  swarms:     SwarmControl,
  heartbeat:  HeartbeatPanel,
  governance: GovernanceQueue,
  budget:     BudgetDashboard,
};

function SystemStatusDot({ status }: { status: "ok" | "warn" | "err" }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === "ok"  && "bg-emerald-500",
        status === "warn" && "bg-amber-400",
        status === "err"  && "bg-red-500 animate-pulse",
      )}
    />
  );
}

export default function Shell() {
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState<ScreenId>("overview");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    return () => root.classList.remove("dark");
  }, [dark]);

  const Screen = SCREEN_MAP[active];

  const groups = (["command", "workforce", "operations", "controls"] as const).map((g) => ({
    key: g,
    label: GROUP_LABELS[g],
    items: NAV_ITEMS.filter((n) => n.group === g),
  }));

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex h-screen w-full overflow-hidden bg-background text-foreground", dark && "dark")}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-sidebar transition-all duration-200 ease-in-out",
            collapsed ? "w-12" : "w-52",
          )}
        >
          {/* Logo row */}
          <div className={cn("flex h-12 items-center gap-2 px-3 shrink-0", collapsed && "justify-center px-0")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold shrink-0">
              PA
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground truncate">
                Pixel Agent
              </span>
            )}
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
            {groups.map((group) => (
              <div key={group.key} className="mb-1">
                {!collapsed && (
                  <p className="mx-3 mb-1 mt-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  const btn = (
                    <button
                      key={item.id}
                      onClick={() => setActive(item.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        collapsed && "justify-center px-0 mx-1 w-auto",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant={item.badgeVariant ?? "secondary"}
                              className="h-4 px-1.5 text-[10px] leading-none"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  );

                  return collapsed ? (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                        {item.badge && ` (${item.badge})`}
                      </TooltipContent>
                    </Tooltip>
                  ) : btn;
                })}
              </div>
            ))}
          </nav>

          {/* System status footer */}
          {!collapsed && (
            <>
              <Separator className="bg-sidebar-border" />
              <div className="px-3 py-2 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mb-1.5">
                  System
                </p>
                {[
                  { label: "API",            status: "ok"   as const },
                  { label: "Circuit Breaker", status: "ok"   as const },
                  { label: "Budget",         status: "warn" as const },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-sidebar-foreground/60">{s.label}</span>
                    <SystemStatusDot status={s.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* ── Main ────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">

          {/* Top bar */}
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Toggle sidebar"
            >
              <ChevronRight
                className={cn("h-4 w-4 transition-transform duration-200", !collapsed && "rotate-180")}
              />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Pixel Labs</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="font-medium">
                {NAV_ITEMS.find((n) => n.id === active)?.label}
              </span>
            </div>

            <div className="flex-1" />

            {/* Status pill */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">
              <Zap className="h-3 w-3 text-amber-400" />
              <span className="text-muted-foreground">1 swarm running</span>
            </div>

            {/* Alert badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">3 governance requests pending</TooltipContent>
            </Tooltip>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Agent avatar */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              BD
            </div>
          </header>

          {/* Screen content */}
          <main className="flex-1 overflow-y-auto">
            <Screen />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
