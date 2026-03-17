import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, agentsTable } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

// Registry of available tools in the system
const TOOL_REGISTRY = [
  { name: "web_search", description: "Search the web for information", category: "research" },
  { name: "web_fetch", description: "Fetch content from a URL", category: "research" },
  { name: "code_execute", description: "Execute code in a sandbox", category: "engineering" },
  { name: "file_read", description: "Read file contents", category: "engineering" },
  { name: "file_write", description: "Write content to a file", category: "engineering" },
  { name: "db_query", description: "Run a database query", category: "data" },
  { name: "email_send", description: "Send an email", category: "communication" },
  { name: "slack_post", description: "Post a message to Slack", category: "communication" },
  { name: "image_generate", description: "Generate an image from a prompt", category: "creative" },
  { name: "memory_read", description: "Read from agent memory", category: "memory" },
  { name: "memory_write", description: "Write to agent memory", category: "memory" },
  { name: "hire_agent", description: "Request to hire a new agent (requires governance)", category: "management" },
  { name: "fire_agent", description: "Request to fire an agent (requires governance)", category: "management" },
  { name: "create_goal", description: "Create a new goal", category: "management" },
  { name: "create_task", description: "Create a new task", category: "management" },
];

const router = Router();

router.get("/tools", (_req, res) => {
  res.json(TOOL_REGISTRY);
});

router.post("/companies/:companyId/agents/:agentId/tools", async (req, res, next) => {
  try {
    const { toolName } = req.body as { toolName: string };
    if (!toolName) return next(new ApiError(400, "toolName is required"));

    const known = TOOL_REGISTRY.find((t) => t.name === toolName);
    if (!known) return next(new ApiError(404, `Tool '${toolName}' not in registry`));

    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, req.params.companyId),
          eq(agentsTable.id, req.params.agentId),
        ),
      );
    if (!agent) return next(new ApiError(404, "Agent not found"));

    const current = (agent.tools ?? []) as string[];
    if (current.includes(toolName)) {
      return res.json(agent);
    }

    const [updated] = await db
      .update(agentsTable)
      .set({ tools: [...current, toolName], updatedAt: new Date() })
      .where(eq(agentsTable.id, req.params.agentId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/companies/:companyId/agents/:agentId/tools", async (req, res, next) => {
  try {
    const { toolName } = req.body as { toolName: string };
    if (!toolName) return next(new ApiError(400, "toolName is required"));

    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, req.params.companyId),
          eq(agentsTable.id, req.params.agentId),
        ),
      );
    if (!agent) return next(new ApiError(404, "Agent not found"));

    const current = (agent.tools ?? []) as string[];
    const [updated] = await db
      .update(agentsTable)
      .set({
        tools: current.filter((t) => t !== toolName),
        updatedAt: new Date(),
      })
      .where(eq(agentsTable.id, req.params.agentId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
