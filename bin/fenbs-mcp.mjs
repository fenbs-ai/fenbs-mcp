#!/usr/bin/env node
/**
 * fenbs-mcp — a stdio bridge to fenbs's remote MCP server.
 *
 * fenbs speaks MCP over HTTP at https://fenbs.ai/api/mcp with an OAuth sign-in, and most clients
 * connect to that directly. This bridge is for the rest: a client that only knows stdio servers,
 * a machine that cannot open a browser (a CI job, a server), or a config format that wants a
 * command rather than a URL. It reads newline-delimited JSON-RPC on stdin, posts each message to
 * the server with a token, and writes the reply to stdout. Nothing is interpreted in between.
 *
 *   FENBS_TOKEN=... npx -y fenbs-mcp
 *   npx -y fenbs-mcp --token ...  [--url https://fenbs.ai/api/mcp]
 *
 * The token comes from fenbs: Settings, "Connect an AI assistant". It acts as the person who
 * issued it and holds their role, narrowed by the scopes they ticked. No dependencies, on purpose.
 */

import { createInterface } from 'node:readline';

const VERSION = '0.1.0';
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args.includes('--version') || args.includes('-v')) {
  console.log(`fenbs-mcp ${VERSION}`);
  process.exit(0);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`fenbs-mcp ${VERSION}
Usage: FENBS_TOKEN=<token> fenbs-mcp [--url <endpoint>]
       fenbs-mcp --token <token> [--url <endpoint>]

Bridges an MCP client that speaks stdio to fenbs's remote MCP server.
Get a token in fenbs under Settings > Connect an AI assistant.
Default endpoint: https://fenbs.ai/api/mcp`);
  process.exit(0);
}

const token = flag('--token') ?? process.env.FENBS_TOKEN;
const url = flag('--url') ?? process.env.FENBS_MCP_URL ?? 'https://fenbs.ai/api/mcp';

if (!token) {
  console.error('fenbs-mcp: no token. Set FENBS_TOKEN or pass --token. Get one in fenbs under Settings > Connect an AI assistant.');
  process.exit(2);
}

// The server may set a session id on the first reply; every later request carries it back.
let sessionId = null;

const out = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);

async function forward(message) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${token}`,
    'X-App-Type': 'fenbs-mcp',
    'X-App-Version': VERSION,
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(message) });
  const got = res.headers.get('mcp-session-id');
  if (got) sessionId = got;

  // A notification has no id and expects no reply; the server answers it with 202 and no body.
  if (res.status === 202 || res.status === 204) return null;

  const text = await res.text();
  if (!res.ok) {
    // fenbs answers a refused call with a JSON-RPC error of its own -- hand that through as it is,
    // so the client sees the server's sentence rather than a description of the status code.
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.jsonrpc === '2.0' && parsed.error) return { ...parsed, id: message.id ?? parsed.id ?? null };
    } catch {
      /* not JSON: fall through to the wrapped error */
    }
    return {
      jsonrpc: '2.0',
      id: message.id ?? null,
      error: { code: -32000, message: `fenbs answered ${res.status}: ${text.slice(0, 300)}` },
    };
  }

  // Streamable HTTP servers may answer as an SSE stream: take the JSON out of the data lines.
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
    const events = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    for (const e of events) {
      try {
        out(JSON.parse(e));
      } catch {
        /* a keep-alive or a comment; not for the client */
      }
    }
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { jsonrpc: '2.0', id: message.id ?? null, error: { code: -32700, message: 'fenbs sent something that was not JSON.' } };
  }
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    out({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    continue;
  }
  try {
    const reply = await forward(message);
    if (reply) out(reply);
  } catch (err) {
    out({ jsonrpc: '2.0', id: message.id ?? null, error: { code: -32001, message: `Could not reach fenbs: ${err?.message ?? err}` } });
  }
}
