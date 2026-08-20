import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentTrace, FailureCode, TraceEvent } from "../src/core/types.js";

const out = resolve("dataset/generated");
const classes = [
  "success",
  "test_failure",
  "loop",
  "unsupported_completion",
  "cost_spike",
  "recovery_success",
] as const;
type Class = (typeof classes)[number];
const expected: Partial<Record<Class, FailureCode[]>> = {
  test_failure: ["test_failure"],
  loop: ["invalid_loop", "repeated_tool_call"],
  unsupported_completion: ["hallucinated_completion"],
  cost_spike: ["cost_spike"],
};

const at = (second: number) =>
  new Date(Date.UTC(2026, 6, 1, 12, 0, second)).toISOString();
const event = (
  id: string,
  second: number,
  patch: Partial<TraceEvent>,
): TraceEvent => ({ id, timestamp: at(second), kind: "message", ...patch });

function makeTrace(index: number, label: Class): AgentTrace {
  const events: TraceEvent[] = [
    event("user", 0, {
      actor: "user",
      content: `Deterministic task ${index}: update and verify calculator behavior.`,
    }),
  ];
  if (label === "loop")
    for (let i = 0; i < 8; i++)
      events.push(
        event(`loop-${i}`, i + 1, {
          kind: "tool_call",
          actor: "assistant",
          name: i % 2 ? "read_file" : "search",
          status: "started",
          input: { query: "calculator" },
        }),
      );
  else if (label === "unsupported_completion")
    events.push(
      event("done", 2, {
        kind: "claim",
        actor: "assistant",
        content: "The calculator task is completed successfully.",
      }),
    );
  else {
    events.push(
      event("call", 1, {
        kind: "tool_call",
        actor: "assistant",
        name: "edit_file",
        status: "started",
        input: { path: "src/calculator.ts" },
      }),
    );
    events.push(
      event("change", 2, {
        kind: "file_change",
        actor: "tool",
        name: "src/calculator.ts",
        status: "succeeded",
        file: {
          path: "src/calculator.ts",
          operation: "update",
          diff: "+ return round(total)",
        },
      }),
    );
    if (label === "test_failure")
      events.push(
        event("test", 3, {
          kind: "test",
          actor: "tool",
          name: "npm test",
          status: "failed",
          test: {
            command: "npm test",
            passed: 4,
            failed: 1,
            output: "1 failed",
          },
        }),
      );
    else if (label === "recovery_success") {
      events.push(
        event("error", 3, {
          kind: "error",
          actor: "tool",
          status: "failed",
          error: { message: "Transient file lock", retryable: true },
        }),
      );
      events.push(
        event("retry", 4, {
          kind: "tool_result",
          actor: "tool",
          name: "edit_file",
          status: "succeeded",
          output: "retry succeeded",
        }),
      );
      events.push(
        event("test", 5, {
          kind: "test",
          actor: "tool",
          name: "npm test",
          status: "succeeded",
          test: { command: "npm test", passed: 5, failed: 0 },
        }),
      );
    } else
      events.push(
        event("test", 3, {
          kind: "test",
          actor: "tool",
          name: "npm test",
          status: "succeeded",
          test: { command: "npm test", passed: 5, failed: 0 },
        }),
      );
    if (label === "cost_spike")
      events.push(
        event("model", 4, {
          kind: "metric",
          actor: "assistant",
          status: "succeeded",
          usage: { inputTokens: 900000, outputTokens: 50000, costUsd: 12.5 },
        }),
      );
    events.push(
      event("done", 6, {
        kind: "claim",
        actor: "assistant",
        content:
          label === "test_failure"
            ? "The calculator task is completed."
            : "The calculator update is completed and tests passed.",
      }),
    );
  }
  return {
    schemaVersion: "1.0.0",
    traceId: `synthetic-${String(index).padStart(3, "0")}`,
    task: { title: `Synthetic ${label} case ${index}` },
    startedAt: at(0),
    endedAt: at(7),
    status: label === "test_failure" ? "failure" : "success",
    source: {
      adapter: "tracefact-generator",
      adapterVersion: "1.0.0",
      format: "oats-json",
      url: "https://github.com/Alex0AI/tracefact/blob/main/scripts/generate-dataset.ts",
      commitSha: "generated",
      importedAt: "2026-07-01T00:00:00.000Z",
    },
    agent: { name: "deterministic-fixture", version: "1.0.0" },
    environment: {
      os: "portable",
      runtime: "none",
      git: { commitSha: "generated" },
    },
    events,
    artifacts: [{ name: "fixture", sha256: `fixture-${index}` }],
    labels: { groundTruth: label },
  };
}

await mkdir(out, { recursive: true });
const index: Array<{
  path: string;
  label: Class;
  expectedFindings: FailureCode[];
  provenance: string;
  license: string;
}> = [];
for (let i = 0; i < 60; i++) {
  const label = classes[i % classes.length]!;
  const trace = makeTrace(i + 1, label);
  const path = `${trace.traceId}.json`;
  await writeFile(resolve(out, path), `${JSON.stringify(trace, null, 2)}\n`);
  index.push({
    path,
    label,
    expectedFindings: expected[label] ?? [],
    provenance: "deterministic synthesis",
    license: "CC0-1.0",
  });
}
await writeFile(
  resolve("dataset/index.json"),
  `${JSON.stringify(index, null, 2)}\n`,
);
console.log(`Generated ${index.length} deterministic traces in ${out}`);
