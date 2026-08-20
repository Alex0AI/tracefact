import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze.js";
import { createCapsule, readCapsule } from "../src/core/capsule.js";
import { buildEvidenceGraph } from "../src/core/evidence.js";
import { detectFailures } from "../src/core/failures.js";
import { sha256, stableStringify } from "../src/core/hash.js";
import { migrateTrace } from "../src/core/migrate.js";
import { redact, redactText } from "../src/core/redact.js";
import type { AgentTrace, TraceEvent } from "../src/core/types.js";

const base = (
  events: TraceEvent[],
  patch: Partial<AgentTrace> = {},
): AgentTrace => ({
  schemaVersion: "1.0.0",
  traceId: "t",
  task: { title: "Fix cart" },
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T00:00:10.000Z",
  status: "success",
  source: {
    adapter: "test",
    adapterVersion: "1",
    importedAt: "2026-01-01T00:00:00.000Z",
    commitSha: "abc",
  },
  agent: { name: "test" },
  environment: { os: "test", git: { commitSha: "abc" } },
  artifacts: [{ name: "a", sha256: "abc" }],
  events,
  ...patch,
});
const e = (
  id: string,
  kind: TraceEvent["kind"],
  patch: Partial<TraceEvent> = {},
): TraceEvent => ({
  id,
  kind,
  timestamp: `2026-01-01T00:00:0${Math.min(9, Number(id.replace(/\D/g, "")) || 0)}.000Z`,
  ...patch,
});

describe("evidence graph", () => {
  it("links passing tests to a completion claim", () => {
    const graph = buildEvidenceGraph(
      base([
        e("1", "test", {
          status: "succeeded",
          name: "cart tests",
          test: { passed: 5, failed: 0 },
        }),
        e("2", "claim", {
          content: "Cart tests passed and the fix is completed.",
        }),
      ]),
    );
    expect(graph.claims[0]?.strength).toBe("supported");
    expect(graph.edges).toHaveLength(1);
  });
  it("marks a claim as conflicting with failure evidence", () => {
    const graph = buildEvidenceGraph(
      base([
        e("1", "test", {
          status: "failed",
          name: "cart tests",
          test: { passed: 4, failed: 1 },
        }),
        e("2", "claim", { content: "Cart tests passed and completed." }),
      ]),
    );
    expect(graph.summary.conflicting).toBe(1);
  });
  it("marks unsupported claims", () =>
    expect(
      buildEvidenceGraph(
        base([
          e("1", "claim", { content: "Everything is done successfully." }),
        ]),
      ).claims[0]?.strength,
    ).toBe("unsupported"));
});

describe("failure taxonomy", () => {
  it("detects loops and repeated calls", () => {
    const events = Array.from({ length: 8 }, (_, i) =>
      e(String(i + 1), "tool_call", {
        name: i % 2 ? "read" : "search",
        input: { q: "x" },
        status: "started",
      }),
    );
    const codes = detectFailures(base(events)).map((x) => x.code);
    expect(codes).toContain("invalid_loop");
    expect(codes).toContain("repeated_tool_call");
  });
  it("detects unverified changes, failed tests, hallucinated completion, cost, termination and recovery", () => {
    const trace = base(
      [
        e("1", "file_change", { file: { path: "a", operation: "update" } }),
        e("2", "test", { status: "failed", test: { passed: 0, failed: 1 } }),
        e("3", "error", { status: "failed", error: { message: "x" } }),
        e("4", "metric", { usage: { costUsd: 12 } }),
        e("5", "claim", { content: "It is fixed and done." }),
      ],
      { endedAt: undefined as never, status: "unknown" },
    );
    const codes = detectFailures(trace).map((x) => x.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "test_failure",
        "hallucinated_completion",
        "cost_spike",
        "premature_termination",
      ]),
    );
  });
  it("detects drift and failed recovery", () => {
    const searches = [
      "alpha issue",
      "alpha docs",
      "beta news",
      "gamma sports",
    ].map((q, i) =>
      e(String(i + 1), "tool_call", {
        name: "search",
        input: { q },
        status: "started",
      }),
    );
    searches.push(
      e("8", "error", { status: "failed", error: { message: "x" } }),
    );
    const codes = detectFailures(base(searches)).map((x) => x.code);
    expect(codes).toContain("retrieval_drift");
    expect(codes).toContain("failed_recovery");
  });
});

describe("integrity and privacy", () => {
  it("redacts secrets, email, paths and sensitive fields", () => {
    const r = redact({
      email: "a@example.com",
      apiKey: "secret-value",
      text: "C:\\Users\\alex\\x sk-abcdefghijklmnop",
    });
    expect(JSON.stringify(r.value)).not.toContain("alex");
    expect(Object.values(r.counts).reduce((a, b) => a + b, 0)).toBeGreaterThan(
      2,
    );
    expect(redactText("Bearer abcdefghijklmnop")).toContain("REDACTED");
  });
  it("round-trips and verifies a capsule", () => {
    const trace = base([e("1", "message", { content: "hello" })]);
    const bytes = createCapsule(trace);
    expect(readCapsule(bytes).trace.traceId).toBe("t");
    const bad = new Uint8Array(bytes);
    const index = Math.floor(bad.length / 2);
    bad[index] = bad[index]! ^ 1;
    expect(() => readCapsule(bad)).toThrow();
  });
  it("creates stable hashes and reports", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(sha256("x")).toBe(
      "2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881",
    );
    expect(analyze(base([])).metrics.recoveryRate).toBe(1);
  });
  it("migrates 0.1 and rejects unknown versions", () => {
    expect(
      migrateTrace({
        schemaVersion: "0.1.0",
        source: { adapter: "x" },
        events: [],
      }).schemaVersion,
    ).toBe("1.0.0");
    expect(() => migrateTrace({ schemaVersion: "9" })).toThrow();
  });
});
