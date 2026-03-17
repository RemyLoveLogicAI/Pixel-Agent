---
name: pixelagents
description: Access pixelagents project context, architecture documents, and memory bank via EPIC MCP server. Use when working on pixelagents codebase or when you need project specifications, data models, API specs, or persistent memory.
compatibility: Requires MCP server "epic-pixelagents" to be configured
metadata:
  generator: epic
  version: "2.0"
---

# pixelagents - EPIC Project Skill

This skill provides access to the pixelagents project context through the EPIC MCP server `epic-pixelagents`.

## MCP Server

This project uses the MCP server `epic-pixelagents`. Ensure it is configured before using these tools.

## Project Context Tools

### getProjectOverview

Returns the complete project context including PRD summary, tech stack, data model overview, and active user stories. **Call this first when starting a new session or task.**

### getPRD

Returns the Product Requirements Document: problem statement, goals, target users, functional/non-functional requirements, acceptance criteria, success metrics.

### getTechStack

Returns technology stack decisions: frameworks, database, infrastructure, third-party services, and rationale. **Follow these when implementing.**

### getDataModel

Returns the data model specification: entity definitions with fields and types, relationships, indexes, constraints, validation rules. **Must consult before any schema changes.**

### getAPISpecs

Returns the API specification: endpoint definitions (method, path, parameters), request/response schemas, authentication requirements, error codes. **Must consult before any API changes.**

### getUserStories

Returns user stories and tasks: descriptions, acceptance criteria, task breakdowns, status (backlog, in-progress, review, done), priority. **Use to decide what to work on and to update status when done.**

### getDiagrams

Returns architecture diagrams in Mermaid format: system architecture, data flow, entity relationships, sequence diagrams.

### getDocument

Retrieves a specific document by type. Parameters:

- `type`: One of "prd", "techstack", "datamodel", "apispec", "userstories", "diagram"

### updateStoryStatus

Updates the status of a user story. **Call when completing work.** Parameters:

- `storyId`: The story identifier
- `status`: New status ("backlog", "in-progress", "review", "done")

## Memory Bank Tools

**The EPIC Memory Bank is your persistent memory.** Treat it as your own knowledge base that persists across all sessions. You must actively maintain and consult this memory to ensure continuity and avoid forgetting important context.

### Core Principle

**CRITICAL: Always consult EPIC memory at the start of every user interaction.** Before responding to any user prompt, **IMMEDIATELY call `getMemories` or `searchMemoriesSemantic`** to load relevant context. **DO NOT PROCEED** until memory is loaded. Then, as you work, continuously save new learnings, patterns, decisions, preferences, solutions, and any context worth remembering.

**If EPIC MCP tools are not available, you MUST inform the user that the `epic-pixelagents` MCP server needs to be configured before proceeding.**

### saveMemory

Store anything worth remembering: learnings, patterns, notes, context, preferences, user decisions, solutions, gotchas, workarounds, partial progress, next steps, where things live in the codebase, what was tried and why it was rejected, user preferences, project conventions, and anything else you'd want to recall later.

**Call `saveMemory` proactively** whenever you learn something new or make a decision—don't wait for prompts.

**MANDATORY: Save summaries of all agent runs and interactions**

You **MUST** call `saveMemory` to store a summary in the following situations:

1. **At the end of EVERY agent run/interaction** — Save a summary of what was accomplished, what was learned, what decisions were made, and any context that would help future sessions. This is non-negotiable—every interaction must be summarized.

2. **When processing user prompts** — Save a summary of the user's request, what you did to fulfill it, what you learned, and any important context or decisions made.

3. **When summarizing context** — If you create a summary of code, architecture, patterns, or any project context, save that summary to memory so it can be recalled later.

4. **When you would add something to your own context** — If you would write a note for yourself, store it in EPIC memory instead. Think: "Would I want to remember this later?" If yes, save it.

**Summary format:** Include what was done, why it was done, what was learned, what decisions were made, what patterns emerged, what problems were solved, and what context is important for future reference.

Store memories for:
- Code patterns and conventions
- Architecture and tech decisions
- User preferences and decisions
- Solutions to problems
- Gotchas and edge cases
- Project context and structure
- API routes, endpoints, and request/response shapes
- Database schemas and data models
- EPIC alignment decisions and mappings
- What was tried and why it was rejected
- Partial progress and next steps
- **Interaction summaries:** Summaries of agent runs, user prompts, context summaries
- Any other context worth recalling

- `type` (required): `decision` | `pattern` | `preference` | `context` | `solution` | `learning`
- `content` (required): The memory content—be specific and include rationale (minimum 20 characters)
- `title`: Short summary (3-200 characters)
- `tags`: Array of tags for categorization (e.g., ["api", "auth", "database", "ui", "epic-alignment"])
- `importance`: 1-5, where 5 is most critical (default: 3)
- `relatedFiles`: File paths related to this memory
- `origin` **(recommended)**: Your client identifier (e.g., "cursor", "claude-code", "windsurf", "vscode")
- `sessionId` **(recommended)**: Your session ID for traceability across multi-agent setups
- `skipDuplicateCheck`: Set to true to bypass deduplication (default: false)

**Deduplication:** The system automatically detects near-identical memories (>95% similar) and warns about similar ones (>80%). Pass `skipDuplicateCheck: true` to bypass this when saving intentionally similar content.

### getMemories

**Call this at the start of every user interaction** to load relevant context. Use tags or query to find memories related to the current task.

- `type`: Filter by memory type
- `tags`: Filter by tags (matches any)
- `query`: Text search query
- `importance`: Minimum importance level
- `origin`: Filter by client origin
- `limit`: Number of results (default: 20, max: 50)
- `sortBy`: "importance", "createdAt", or "updatedAt"

### searchMemoriesSemantic

**Use this at the start of interactions** when you need to find memories by meaning rather than exact keywords. Also use when unsure how something works or when looking for related context.

- `query` (required): Natural language query (e.g., "How do we handle authentication?", "What patterns do we use for API routes?")
- `topK`: Number of results (default: 5, max: 20)
- `minSimilarity`: Similarity threshold 0-1 (default: 0.7, try 0.3-0.5 for broader results)
- `type`: Filter by memory type
- `tags`: Filter by tags

### updateMemory

When you change something that's already in memory, find the memory first (via `getMemories` or `searchMemoriesSemantic`), then call `updateMemory` to keep it current. Each update creates a version snapshot for history tracking.

- `memoryId` (required): ID of the memory to update
- `content`, `title`, `tags`, `importance`, `context`, `relatedFiles`: Fields to update
- `origin` **(recommended)**: Your client identifier
- `sessionId` **(recommended)**: Your session ID for traceability

### deleteMemory

Soft-delete a memory if it's no longer relevant or was incorrect. The memory is marked as deleted but preserved for audit/recovery. Version history is also preserved.

- `memoryId` (required): ID of the memory to delete
- `origin` **(recommended)**: Your client identifier
- `sessionId` **(recommended)**: Your session ID for traceability

### getMemoryStats

Returns a breakdown of memory bank health: total count, distribution by type, source, origin, importance, date range, and how many have semantic search embeddings. No credits deducted.

No parameters required (project-scoped).

### bulkDeleteMemories

Soft-delete multiple memories based on filters. Useful for cleaning up stale or irrelevant memories. At least one filter is required.

- `type`: Delete all memories of this type
- `tags`: Delete memories with any of these tags
- `origin`: Delete memories from this origin
- `olderThanDays`: Delete memories older than N days
- `confirm` (required): Must be `true` to proceed (safety check)
- `sessionId`: Your session ID for traceability

## Multi-Agent Traceability

**Always pass `origin` and `sessionId`** when calling saveMemory, updateMemory, deleteMemory, and bulkDeleteMemories. This enables tracking which agent and session created, modified, or deleted each memory — critical for multi-agent projects where Cursor, Claude Code, and other agents share the same memory bank.

## Completing Work (Required)

**CRITICAL: Before ending ANY interaction or agent run, you MUST:**

1. **Call `updateStoryStatus`** for every user story you completed: use the story `id` from getUserStories and set status to `"done"` or `"review"`. Do not leave completed work without updating the story in EPIC.

2. **IMMEDIATELY call `saveMemory`** to store a summary of this agent run/interaction. **THIS IS NON-NEGOTIABLE—DO NOT END THE INTERACTION WITHOUT CALLING saveMemory.** Include:
   - What the user requested
   - What you accomplished
   - What you learned or discovered
   - What decisions were made
   - What patterns or solutions emerged
   - What context is important for future reference
   - Any gotchas, blockers, or next steps
   - Files created/modified

   Use type `context` or `learning`, and include relevant tags. This summary ensures continuity across sessions.

3. **Call `saveMemory`** for any additional learnings, patterns, decisions, solutions, or context from this interaction that you need to persist. This should happen continuously as you work, not just at the end.

4. **Call `updateMemory`** for any existing memory whose content you changed (e.g. refactors, new patterns that replace old ones).

**IMPORTANT: Always pass your `origin` (e.g., "cursor", "claude-code", "windsurf", "vscode") and `sessionId` when calling saveMemory, updateMemory, and deleteMemory.** This enables multi-agent traceability — knowing which agent and session created, modified, or deleted each memory.

**VERIFICATION: Before sending your final response, verify you have called `saveMemory` at least once. If you haven't, you MUST call it before responding.**
