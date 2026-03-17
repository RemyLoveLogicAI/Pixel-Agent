import { useState, useEffect } from "react";
import "./App.css";

// Types for our domain
interface Company {
  id: string;
  name: string;
  mission: string;
  status: "active" | "paused" | "archived";
  budgetMonthlyUsd: number;
  budgetUsedUsd: number;
  circuitBreaker: "closed" | "open" | "half_open";
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  companyId: string;
  name: string;
  role: string;
  level: number;
  title: string;
  managerId: string | null;
  model: string;
  status: "idle" | "thinking" | "executing" | "waiting_approval" | "error" | "circuit_open" | "terminated";
  budgetMonthlyUsd: number;
  budgetUsedUsd: number;
  heartbeatIntervalSec: number;
  nextHeartbeatAt: string | null;
  deskX: number | null;
  deskY: number | null;
  spriteKey: string | null;
}

interface Goal {
  id: string;
  companyId: string;
  parentId: string | null;
  assignedTo: string | null;
  title: string;
  description: string | null;
  status: "proposed" | "active" | "blocked" | "completed" | "cancelled";
  priority: number;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  companyId: string;
  goalId: string | null;
  title: string;
  description: string | null;
  claimedBy: string | null;
  status: "pending" | "claimed" | "in_progress" | "review" | "done" | "failed" | "cancelled";
  version: number;
  result: unknown;
  createdAt: string;
  updatedAt: string;
}

// SSE Event types
type SSEEvent =
  | { type: "connected"; data: { companyId: string } }
  | { type: "agent.state_change"; agent_id: string; from: string; to: string }
  | { type: "agent.heartbeat.start"; agent_id: string; heartbeat_run_id: string }
  | { type: "agent.heartbeat.complete"; agent_id: string; result: unknown }
  | { type: "task.claimed"; task_id: string; agent_id: string }
  | { type: "task.completed"; task_id: string; result: unknown }
  | { type: "governance.new_request"; request: unknown }
  | { type: "budget.alert"; alert: unknown };

const API_BASE = "/api";

function App() {
  const [view, setView] = useState<string>("dashboard");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
