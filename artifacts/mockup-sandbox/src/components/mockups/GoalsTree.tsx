import { Badge } from "@/components/ui/badge";

type GoalStatus = "proposed" | "active" | "blocked" | "completed" | "cancelled";

interface Goal {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: number;
  assignedTo?: string;
  dueAt?: string;
  children: Goal[];
}

const goals: Goal[] = [
  {
    id: "1",
    title: "Ship v1.0 Product",
    description: "End-to-end release of the core platform",
    status: "active",
    priority: 1,
    assignedTo: "Atlas",
    dueAt: "2026-04-01",
    children: [
      {
        id: "2",
        title: "Backend API complete",
        description: "All REST endpoints implemented and tested",
        status: "active",
        priority: 1,
        assignedTo: "Luna",
        children: [
          {
            id: "4",
            title: "Auth service",
            status: "completed",
            priority: 1,
            assignedTo: "Kai",
            children: [],
          },
          {
            id: "5",
            title: "Agents CRUD endpoints",
            status: "active",
            priority: 1,
            assignedTo: "Kai",
            children: [],
          },
          {
            id: "6",
            title: "SSE event streaming",
            status: "proposed",
            priority: 2,
            assignedTo: "Kai",
            children: [],
          },
        ],
      },
      {
        id: "3",
        title: "Frontend dashboard",
        description: "React UI for company & agent management",
        status: "blocked",
        priority: 2,
        assignedTo: "Nova",
        children: [
          {
            id: "7",
            title: "Design system setup",
            status: "completed",
            priority: 1,
            assignedTo: "Nova",
            children: [],
          },
          {
            id: "8",
            title: "Company overview page",
            status: "blocked",
            priority: 1,
            assignedTo: "Nova",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "9",
    title: "Improve observability",
    description: "Traces, cost tracking, and alerting",
    status: "proposed",
    priority: 3,
    children: [],
  },
];

const statusConfig: Record<GoalStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: string }> = {
  proposed: { label: "Proposed", variant: "outline", icon: "○" },
  active: { label: "Active", variant: "default", icon: "▶" },
  blocked: { label: "Blocked", variant: "destructive", icon: "⊘" },
  completed: { label: "Done", variant: "secondary", icon: "✓" },
  cancelled: { label: "Cancelled", variant: "outline", icon: "✕" },
};

function GoalNode({ goal, depth = 0 }: { goal: Goal; depth?: number }) {
  const st = statusConfig[goal.status];
  const isLeaf = goal.children.length === 0;

  return (
    <div className={depth > 0 ? "ml-6 border-l border-gray-200 pl-4" : ""}>
      <div
        className={`flex items-start gap-3 py-2.5 px-3 rounded-lg mb-1 ${
          goal.status === "completed"
            ? "opacity-60"
            : "hover:bg-gray-50"
        }`}
      >
        <span className="mt-0.5 text-gray-400 text-sm w-4 flex-shrink-0">
          {isLeaf ? "◦" : "▾"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-medium text-sm ${
                goal.status === "completed" ? "line-through text-gray-400" : "text-gray-900"
              }`}
            >
              {goal.title}
            </span>
            <Badge variant={st.variant} className="text-xs py-0">
              {st.icon} {st.label}
            </Badge>
            {goal.priority <= 1 && goal.status !== "completed" && (
              <span className="text-xs text-red-500 font-medium">P1</span>
            )}
          </div>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {goal.assignedTo && <span>→ {goal.assignedTo}</span>}
            {goal.dueAt && <span>Due {goal.dueAt}</span>}
          </div>
        </div>
      </div>

      {goal.children.map((child) => (
        <GoalNode key={child.id} goal={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function GoalsTree() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">Hierarchical goal tree · Pixel Labs Inc.</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6 text-sm">
        {(["active", "proposed", "blocked", "completed"] as GoalStatus[]).map((s) => {
          const count = countByStatus(goals, s);
          const st = statusConfig[s];
          return (
            <span key={s} className="text-muted-foreground">
              <span className="font-medium text-foreground">{count}</span> {st.label.toLowerCase()}
            </span>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-1">
        {goals.map((g) => (
          <GoalNode key={g.id} goal={g} />
        ))}
      </div>
    </div>
  );
}

function countByStatus(goals: Goal[], status: GoalStatus): number {
  return goals.reduce((acc, g) => {
    return acc + (g.status === status ? 1 : 0) + countByStatus(g.children, status);
  }, 0);
}
