import { buildEvidenceGraph } from "./evidence.js";
import { detectFailures } from "./failures.js";
import { sha256 } from "./hash.js";
import type {
  AgentTrace,
  ReliabilityMetrics,
  ReliabilityReport,
} from "./types.js";

export function metrics(
  trace: AgentTrace,
  evidenceCoverage: number,
): ReliabilityMetrics {
  const started = Date.parse(trace.startedAt);
  const ended = Date.parse(
    trace.endedAt ?? trace.events.at(-1)?.timestamp ?? trace.startedAt,
  );
  const calls = trace.events.filter((e) => e.kind === "tool_call");
  const failures = trace.events.filter(
    (e) => e.status === "failed" || e.kind === "error",
  );
  const recovered = failures.filter((error) =>
    trace.events.some(
      (e) => e.timestamp > error.timestamp && e.status === "succeeded",
    ),
  ).length;
  const usage = trace.events.map((e) => e.usage).filter(Boolean);
  const reproducibilityParts = [
    Boolean(trace.source.commitSha || trace.environment?.git?.commitSha),
    Boolean(trace.endedAt),
    Boolean(
      trace.artifacts?.length || trace.events.some((e) => e.artifact?.sha256),
    ),
    Boolean(trace.environment),
    trace.events.some((e) => e.kind === "test"),
  ];
  const uncertainty: string[] = [];
  if (!trace.source.commitSha && !trace.environment?.git?.commitSha)
    uncertainty.push("No source commit SHA was recorded.");
  if (!usage.length)
    uncertainty.push("Token and cost telemetry were not present.");
  if (!trace.events.some((e) => e.kind === "test"))
    uncertainty.push("No test event was recorded.");
  return {
    durationMs: Math.max(0, ended - started),
    eventCount: trace.events.length,
    toolCalls: calls.length,
    toolFailures: calls.filter((e) => e.status === "failed").length,
    uniqueTools: new Set(calls.map((e) => e.name)).size,
    inputTokens: usage.reduce((n, x) => n + (x?.inputTokens ?? 0), 0),
    outputTokens: usage.reduce((n, x) => n + (x?.outputTokens ?? 0), 0),
    costUsd: usage.reduce((n, x) => n + (x?.costUsd ?? 0), 0),
    evidenceCoverage,
    reproducibility:
      reproducibilityParts.filter(Boolean).length / reproducibilityParts.length,
    recoveryRate: failures.length ? recovered / failures.length : 1,
    uncertainty,
  };
}

export function analyze(trace: AgentTrace): ReliabilityReport {
  const evidenceGraph = buildEvidenceGraph(trace);
  const covered = evidenceGraph.claims.filter(
    (c) => c.strength === "supported" || c.strength === "weak",
  ).length;
  return {
    reportVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    trace,
    evidenceGraph,
    findings: detectFailures(trace),
    metrics: metrics(
      trace,
      evidenceGraph.claims.length ? covered / evidenceGraph.claims.length : 0,
    ),
    integrity: { algorithm: "sha256", traceHash: sha256(trace) },
  };
}
