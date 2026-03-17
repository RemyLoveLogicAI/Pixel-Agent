import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RequestType = "hire" | "fire" | "budget_override" | "swarm_approval" | "escalation" | "tool_access" | "strategy_change";
type RequestStatus = "pending" | "approved" | "rejected" | "expired";

interface GovernanceRequest {
  id: string;
  requestType: RequestType;
  description: string;
  requestingAgent: string;
  estimatedCostUsd?: number;
  status: RequestStatus;
  createdAt: string;
  expiresIn?: string;
}

const requests: GovernanceRequest[] = [
  {
    id: "gov-1",
    requestType: "hire",
    description: "Request to hire a DevOps Engineer agent to manage infrastructure automation and CI/CD pipelines.",
    requestingAgent: "Luna",
    estimatedCostUsd: 200,
    status: "pending",
    createdAt: "15m ago",
    expiresIn: "45m",
  },
  {
    id: "gov-2",
    requestType: "swarm_approval",
    description: "Launch a 4-agent swarm to build the Q2 marketing landing page with copywriting, design, and development specialists.",
    requestingAgent: "Sage",
    estimatedCostUsd: 0.85,
    status: "pending",
    createdAt: "22m ago",
    expiresIn: "38m",
  },
  {
    id: "gov-3",
    requestType: "budget_override",
    description: "Agent Kai has reached 85% of monthly budget. Requesting 50% budget increase to complete auth service implementation.",
    requestingAgent: "Luna",
    estimatedCostUsd: 100,
    status: "pending",
    createdAt: "1h ago",
    expiresIn: "2h",
  },
  {
    id: "gov-4",
    requestType: "tool_access",
    description: "Nova is requesting access to image_generate tool to create marketing assets for the landing page.",
    requestingAgent: "Nova",
    status: "approved",
    createdAt: "3h ago",
  },
  {
    id: "gov-5",
    requestType: "fire",
    description: "Request to terminate agent Echo due to persistent errors and inability to complete assigned QA tasks.",
    requestingAgent: "Luna",
    status: "rejected",
    createdAt: "5h ago",
  },
];

const typeConfig: Record<RequestType, { label: string; icon: string; color: string }> = {
  hire: { label: "Hire Agent", icon: "👤", color: "bg-blue-50 text-blue-700 border-blue-200" },
  fire: { label: "Fire Agent", icon: "🚫", color: "bg-red-50 text-red-700 border-red-200" },
  budget_override: { label: "Budget Override", icon: "💰", color: "bg-amber-50 text-amber-700 border-amber-200" },
  swarm_approval: { label: "Swarm Launch", icon: "🌀", color: "bg-purple-50 text-purple-700 border-purple-200" },
  escalation: { label: "Escalation", icon: "⚡", color: "bg-orange-50 text-orange-700 border-orange-200" },
  tool_access: { label: "Tool Access", icon: "🔧", color: "bg-gray-50 text-gray-700 border-gray-200" },
  strategy_change: { label: "Strategy Change", icon: "🗺️", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const statusConfig: Record<RequestStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-500" },
};

export default function GovernanceQueue() {
  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Governance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} pending approval{pending.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Requires Action</h2>
          {pending.map((req) => {
            const tc = typeConfig[req.requestType];
            return (
              <Card key={req.id} className="border-amber-200">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-xl mt-0.5">{tc.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${tc.color}`}>
                            {tc.label}
                          </span>
                          <span className="text-xs text-muted-foreground">from {req.requestingAgent}</span>
                          <span className="text-xs text-muted-foreground">{req.createdAt}</span>
                          {req.expiresIn && (
                            <span className="text-xs text-amber-600">expires in {req.expiresIn}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{req.description}</p>
                        {req.estimatedCostUsd !== undefined && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Estimated cost: <span className="font-medium">${req.estimatedCostUsd.toFixed(2)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700">
                        Approve
                      </button>
                      <button className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-md font-medium hover:bg-red-50">
                        Reject
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* History */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">History</h2>
        {history.map((req) => {
          const tc = typeConfig[req.requestType];
          const sc = statusConfig[req.status];
          return (
            <div key={req.id} className="flex items-center gap-3 py-2 px-3 bg-white rounded-lg border text-sm">
              <span>{tc.icon}</span>
              <span className="text-muted-foreground text-xs w-16 flex-shrink-0">{req.createdAt}</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${sc.color}`}>{sc.label}</span>
              <span className="flex-1 text-gray-700 truncate">{req.description}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">by {req.requestingAgent}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
