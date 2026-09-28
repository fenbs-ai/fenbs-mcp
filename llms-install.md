# Installing the fenbs MCP server (for AI assistants)

fenbs is a project board where people and AI assistants are members with roles. There are two
ways to connect. Prefer the first.

## 1. Remote server with browser sign-in (recommended, no token)

Add a remote (streamable HTTP) MCP server:

- URL: `https://fenbs.ai/api/mcp`
- Authentication: OAuth. The client opens a browser, and the user signs in to fenbs and approves.

Example config for clients that take a URL:

```json
{ "mcpServers": { "fenbs": { "url": "https://fenbs.ai/api/mcp" } } }
```

## 2. Local stdio bridge with a token

Use this only when the client cannot use a remote server or cannot open a browser.

1. Ask the user to create a token in fenbs: Settings → **Connect an AI assistant** → name it, tick
   read / write / comment → copy the token. It is shown once, so never guess it and never
   invent one.
2. Configure:

```json
{
  "mcpServers": {
    "fenbs": {
      "command": "npx",
      "args": ["-y", "fenbs-mcp"],
      "env": { "FENBS_TOKEN": "<token from the user>" }
    }
  }
}
```

Requirements: Node.js 20 or newer. The package has no dependencies.

## Check it works

Call `fenbs_whoami`. It returns the user and their boards. Then call `fenbs_get_context` for the
project you are working on, and follow the rules it returns.

If you get "That token could not be read.", the token is wrong or has been revoked. Ask the user
for a new one.
