type AgentStatus = "idle" | "thinking" | "executing" | "waiting_approval" | "error" | "circuit_open";

interface AgentNode {
  id: string;
  name: string;
  title: string;
  status: AgentStatus;
  model: string;
  children: AgentNode[];
}

const orgTree: AgentNode = {
  id: "1",
  name: "Atlas",
  title: "CEO",
  status: "idle",
  model: "claude-opus-4-6",
  children: [
    {
      id: "2",
      name: "Sage",
      title: "Product Manager",
      status: "waiting_approval",
      model: "claude-sonnet-4-6",
      children: [],
    },
    {
      id: "3",
      name: "Luna",
      title: "VP Engineering",
      status: "executing",
      model: "claude-sonnet-4-6",
      children: [
        {
          id: "4",
          name: "Kai",
          title: "Backend Engineer",
          status: "thinking",
          model: "claude-sonnet-4-6",
          children: [],
        },
        {
          id: "5",
          name: "Nova",
          title: "Frontend Engineer",
          status: "idle",
          model: "claude-haiku-4-5",
          children: [],
        },
        {
          id: "6",
          name: "Echo",
          title: "QA Engineer",
          status: "error",
          model: "claude-haiku-4-5",
          children: [],
        },
      ],
    },
  ],
};

const statusDot: Record<AgentStatus, string> = {
  idle: "bg-gray-300",
  thinking: "bg-blue-500 animate-pulse",
  executing: "bg-emerald-500 animate-pulse",
  waiting_approval: "bg-amber-400",
  error: "bg-red-500",
  circuit_open: "bg-orange-500",
};

const statusBorder: Record<AgentStatus, string> = {
  idle: "border-gray-200",
  thinking: "border-blue-300",
  executing: "border-emerald-300",
  waiting_approval: "border-amber-300",
  error: "border-red-300",
  circuit_open: "border-orange-300",
};

function AgentCard({ node }: { node: AgentNode }) {
  return (
    <div className={`border-2 rounded-xl px-4 py-3 bg-white shadow-sm min-w-[140px] ${statusBorder[node.status]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[node.status]}`} />
        <span className="font-semibold text-sm">{node.name}</span>
      </div>
      <p className="text-xs text-gray-500">{node.title}</p>
      <p className="text-xs font-mono text-gray-400 mt-1 truncate">{node.model.replace("claude-", "")}</p>
    </div>
  );
}

function TreeNode({ node, isRoot = false }: { node: AgentNode; isRoot?: boolean }) {
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {!isRoot && (
        <div className="w-px h-6 bg-gray-200" />
      )}
      <AgentCard node={node} />
      {hasChildren && (
        <>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-start gap-6 relative">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-gray-200"
                style={{
                  left: `calc(50% - (${node.children.length - 1} * 88px))`,
                  width: `${(node.children.length - 1) * 176}px`,
                }}
              />
            )}
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChart() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Org Chart</h1>
        <p className="text-sm text-muted-foreground mt-1">Pixel Labs Inc. · 6 agents</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-8 text-xs">
        {[
          { status: "idle" as AgentStatus, label: "Idle" },
          { status: "thinking" as AgentStatus, label: "Thinking" },
          { status: "executing" as AgentStatus, label: "Executing" },
          { status: "waiting_approval" as AgentStatus, label: "Awaiting Approval" },
          { status: "error" as AgentStatus, label: "Error" },
        ].map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-auto pb-8">
        <div className="inline-flex">
          <TreeNode node={orgTree} isRoot />
        </div>
      </div>
    </div>
  );
}
