import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TaskStatus = "pending" | "claimed" | "in_progress" | "review" | "done" | "failed" | "cancelled";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  claimedBy?: string;
  goalTitle?: string;
  version: number;
}

const tasks: Task[] = [
  { id: "t1", title: "Implement JWT auth middleware", status: "in_progress", claimedBy: "Kai", goalTitle: "Auth service", version: 3 },
  { id: "t2", title: "Write unit tests for auth service", status: "pending", goalTitle: "Auth service", version: 0 },
  { id: "t3", title: "Design API rate limiting strategy", status: "review", claimedBy: "Luna", version: 2 },
  { id: "t4", title: "Set up PostgreSQL connection pooling", status: "done", claimedBy: "Kai", goalTitle: "Backend API complete", version: 4 },
  { id: "t5", title: "Create OpenAPI spec for agents endpoint", status: "done", claimedBy: "Luna", version: 2 },
  { id: "t6", title: "Build company dashboard UI", status: "claimed", claimedBy: "Nova", goalTitle: "Frontend dashboard", version: 1 },
  { id: "t7", title: "Integrate React Query hooks", status: "pending", goalTitle: "Frontend dashboard", version: 0 },
  { id: "t8", title: "Fix SSE connection drops on reconnect", status: "failed", claimedBy: "Echo", version: 5 },
  { id: "t9", title: "Write integration tests for heartbeat", status: "pending", version: 0 },
  { id: "t10", title: "Document governance request flow", status: "in_progress", claimedBy: "Sage", version: 1 },
];

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: "pending", label: "Pending", color: "border-t-gray-300" },
  { status: "claimed", label: "Claimed", color: "border-t-blue-300" },
  { status: "in_progress", label: "In Progress", color: "border-t-blue-500" },
  { status: "review", label: "Review", color: "border-t-purple-400" },
  { status: "done", label: "Done", color: "border-t-emerald-400" },
];

const statusBadge: Record<TaskStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pending: { variant: "outline", label: "Pending" },
  claimed: { variant: "secondary", label: "Claimed" },
  in_progress: { variant: "default", label: "In Progress" },
  review: { variant: "default", label: "Review" },
  done: { variant: "secondary", label: "Done" },
  failed: { variant: "destructive", label: "Failed" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

export default function TaskBoard() {
  const getTasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tasks.filter((t) => t.status === "in_progress" || t.status === "claimed").length} active ·{" "}
          {tasks.filter((t) => t.status === "pending").length} pending ·{" "}
          {tasks.filter((t) => t.status === "done").length} done
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = getTasksByStatus(col.status);
          return (
            <div key={col.status} className="flex-shrink-0 w-64">
              <div className={`bg-white rounded-xl border border-t-4 ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm">{col.label}</span>
                  <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <div key={task.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-sm font-medium leading-snug">{task.title}</p>
                      {task.goalTitle && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">→ {task.goalTitle}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        {task.claimedBy ? (
                          <span className="text-xs text-blue-600 font-medium">{task.claimedBy}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                        <span className="text-xs text-gray-400">v{task.version}</span>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">Empty</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
