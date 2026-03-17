---
name: my-workflow
description: "A workflow template designed to orchestrate automated processes with clear entry and exit points."
agent: agent
---
```mermaid
flowchart TD
    start_node_default([Start])
    end_node_default([End])

```

## Workflow Execution Guide

Follow the Mermaid flowchart above to execute the workflow. Each node type has specific execution methods as described below.

### Execution Methods by Node Type

- **Rectangle nodes (Sub-Agent: ...)**: Execute Sub-Agents using the #runSubagent tool
- **Diamond nodes (AskUserQuestion:...)**: Use the Ask tool to prompt the user and branch based on their response
- **Diamond nodes (Branch/Switch:...)**: Automatically branch based on the results of previous processing (see details section)
- **Rectangle nodes (Prompt nodes)**: Execute the prompts described in the details section below
