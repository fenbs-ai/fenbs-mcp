# fenbs-mcp

Connect any MCP client to your [fenbs](https://fenbs.ai) board.

fenbs is the simple project management tool where people and AI assistants are both members of a
board, each holding a role, and every change is signed by who made it. Four lanes, three kinds of
task (Feature, Enhancement, Bug), roles in plain words, and an audit trail that names the assistant.
Decisions with sign-off, testing recorded on each task, and tasks a person can pre-approve for an AI
assistant to pick up when it is free.

## You probably do not need this package

fenbs speaks MCP over HTTP with a browser sign-in. Most clients connect to it directly, with no
token to copy:

| Client | How |
|---|---|
| Claude Code | `claude mcp add --transport http fenbs https://fenbs.ai/api/mcp` then `/mcp` |
| Claude (desktop / web) | Settings → Connectors → add `https://fenbs.ai/api/mcp` |
| Cursor | `mcp.json`: `{"mcpServers":{"fenbs":{"url":"https://fenbs.ai/api/mcp"}}}` |
| VS Code (Copilot) | `.vscode/mcp.json`: `{"servers":{"fenbs":{"type":"http","url":"https://fenbs.ai/api/mcp"}}}` |
| ChatGPT | Settings → Connectors → custom connector with the URL, where your plan allows it |

Step-by-step pages: <https://fenbs.ai/integrations>

## When you do

Use `fenbs-mcp` when the client only speaks **stdio**, or the machine cannot open a browser (CI, a
server, a container). It bridges stdin/stdout to the remote server with a token you issue by hand.

1. In fenbs: Settings → **Connect an AI assistant** → name it, tick read / write / comment → copy the
   token. It is shown once.
2. Run:

```sh
FENBS_TOKEN=your-token npx -y fenbs-mcp
```

Or in a client config that wants a command:

```json
{
  "mcpServers": {
    "fenbs": {
      "command": "npx",
      "args": ["-y", "fenbs-mcp"],
      "env": { "FENBS_TOKEN": "your-token" }
    }
  }
}
```

## What the assistant can then do

Tasks: `fenbs_whoami` · `fenbs_list_boards` · `fenbs_list_items` · `fenbs_get_item` · `fenbs_create_item` ·
`fenbs_update_item` · `fenbs_flag_item` · `fenbs_comment` · `fenbs_search` · `fenbs_delete_item` · `fenbs_restore_item`

Pre-approved for AI: `fenbs_next_approved_task` · `fenbs_release_task`

Decisions and rules: `fenbs_list_decisions` · `fenbs_get_decision` · `fenbs_add_decision` · `fenbs_update_decision` ·
`fenbs_request_signoff` · `fenbs_delete_decision` · `fenbs_restore_decision`

AI context: `fenbs_get_context` · `fenbs_add_context_note` · `fenbs_list_context_notes` ·
`fenbs_update_context_note` · `fenbs_delete_context_note`

**Rules are decisions.** A rule is a decision that holds from now on (`standingRule: true`). When a
person says how something must always, or never, be done, the assistant records it with
`fenbs_add_decision` (status `decided`, the person as decider, their words quoted), never as a context
note. `fenbs_get_context` shows the rules first and in full; assistants follow every one. Context notes
are only for facts nobody chose: how the code works, a trap, where something lives.

Projects: `fenbs_list_projects` · `fenbs_add_project` · `fenbs_rename_project` · `fenbs_delete_project` ·
`fenbs_restore_project`

The list comes from fenbs itself, so a new tool arrives without updating this package.

It acts as the person who issued the token and holds their role on the board, narrowed by the
scopes they ticked. A refusal is a sentence it can repeat to you: *"You are a Viewer on Kitchen
Refit, which cannot move tasks between lanes."* Revoke the token in Settings and it stops at once.

The whole guide, written for people and assistants alike: <https://fenbs.ai/llms.txt>

## Options

```
FENBS_TOKEN      the token (or --token <token>)
FENBS_MCP_URL    the endpoint (or --url <url>); default https://fenbs.ai/api/mcp
--version, --help
```

No dependencies. Node 20 or newer. MIT.
