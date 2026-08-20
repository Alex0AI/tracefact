#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { analyze } from "./core/analyze.js";
import type { AgentTrace } from "./core/types.js";

const store = resolve(process.env.TRACEFACT_STORE ?? "dataset/generated");
const ok = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: unknown, message: string) => ({
  jsonrpc: "2.0",
  id,
  error: { code: -32000, message },
});

async function listRuns() {
  return (await readdir(store)).filter((x) => x.endsWith(".json")).sort();
}
async function getRun(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9_.-]/g, "");
  if (safe !== id) throw new Error("Invalid run id");
  return JSON.parse(await readFile(resolve(store, safe), "utf8")) as AgentTrace;
}

async function handle(request: {
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
}) {
  const id = request.id;
  if (request.method === "initialize")
    return ok(id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "tracefact-readonly", version: "0.1.0" },
    });
  if (request.method === "notifications/initialized") return undefined;
  if (request.method === "tools/list")
    return ok(id, {
      tools: [
        {
          name: "list_runs",
          description: "List locally stored agent run IDs. Read-only.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_run",
          description: "Get a normalized Open Agent Trace by ID. Read-only.",
          inputSchema: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" } },
          },
        },
        {
          name: "get_reliability_report",
          description:
            "Analyze a stored run and return evidence-linked findings. Read-only.",
          inputSchema: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" } },
          },
        },
      ],
    });
  if (request.method === "tools/call") {
    const name = String(request.params?.name ?? "");
    const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
    if (name === "list_runs")
      return ok(id, {
        content: [{ type: "text", text: JSON.stringify(await listRuns()) }],
      });
    if (name === "get_run")
      return ok(id, {
        content: [
          { type: "text", text: JSON.stringify(await getRun(String(args.id))) },
        ],
      });
    if (name === "get_reliability_report")
      return ok(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(analyze(await getRun(String(args.id)))),
          },
        ],
      });
    return fail(id, `Unknown tool: ${name}`);
  }
  return fail(id, `Unsupported method: ${String(request.method)}`);
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  void (async () => {
    try {
      const response = await handle(JSON.parse(line));
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      process.stdout.write(
        `${JSON.stringify(fail(null, error instanceof Error ? error.message : String(error)))}\n`,
      );
    }
  })();
});

export { handle };
