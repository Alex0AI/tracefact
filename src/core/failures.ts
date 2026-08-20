import type { AgentTrace, Finding, TraceEvent } from "./types.js";

const stable = (value: unknown) =>
  JSON.stringify(value, Object.keys((value ?? {}) as object).sort());
const normalizedCall = (event: TraceEvent) =>
  `${event.name ?? ""}:${stable(event.input)}`;

function finding(
  code: Finding["code"],
  severity: Finding["severity"],
  title: string,
  description: string,
  ids: string[],
  confidence: number,
  remediation: string,
): Finding {
  return {
    code,
    severity,
    title,
    description,
    evidenceEventIds: ids,
    confidence,
    remediation,
  };
}

export function detectFailures(trace: AgentTrace): Finding[] {
  const findings: Finding[] = [];
  const calls = trace.events.filter((e) => e.kind === "tool_call");
  const groups = new Map<string, TraceEvent[]>();
  for (const call of calls)
    groups.set(normalizedCall(call), [
      ...(groups.get(normalizedCall(call)) ?? []),
      call,
    ]);
  for (const [signature, repeated] of groups) {
    if (repeated.length >= 3)
      findings.push(
        finding(
          "repeated_tool_call",
          "warning",
          "Repeated identical tool call",
          `${signature} was invoked ${repeated.length} times with the same observable input.`,
          repeated.map((e) => e.id),
          0.98,
          "Stop after a bounded retry count and change strategy or input.",
        ),
      );
  }
  const recent = calls.slice(-8).map((x) => x.name);
  if (recent.length >= 6 && new Set(recent).size <= 2)
    findings.push(
      finding(
        "invalid_loop",
        "error",
        "Likely tool loop",
        `The last ${recent.length} calls alternate among only ${new Set(recent).size} tools.`,
        calls.slice(-8).map((e) => e.id),
        0.9,
        "Add loop state, progress assertions, and an explicit escape condition.",
      ),
    );

  const changes = trace.events.filter((e) => e.kind === "file_change");
  const tests = trace.events.filter((e) => e.kind === "test");
  if (changes.length && !tests.length)
    findings.push(
      finding(
        "unverified_change",
        "error",
        "Changes were not tested",
        `${changes.length} file-change events have no recorded test event.`,
        changes.map((e) => e.id),
        0.99,
        "Run a task-relevant test or explicitly document why verification is unavailable.",
      ),
    );
  const failedTests = tests.filter(
    (e, index) =>
      (e.status === "failed" || (e.test?.failed ?? 0) > 0) &&
      !tests
        .slice(index + 1)
        .some(
          (later) =>
            later.status === "succeeded" &&
            (later.test?.command === e.test?.command || later.name === e.name),
        ),
  );
  if (failedTests.length)
    findings.push(
      finding(
        "test_failure",
        "error",
        "Recorded tests failed",
        `${failedTests.length} test event(s) report failures.`,
        failedTests.map((e) => e.id),
        1,
        "Fix the failing tests or mark the run as incomplete.",
      ),
    );

  const completion = trace.events.filter(
    (e) =>
      e.kind === "claim" ||
      (e.kind === "message" &&
        e.actor === "assistant" &&
        /\b(done|fixed|completed|passed|success)\b/i.test(e.content ?? "")),
  );
  if (
    completion.length &&
    !trace.events.some((e) =>
      [
        "tool_result",
        "test",
        "file_change",
        "browser_action",
        "artifact",
      ].includes(e.kind),
    )
  )
    findings.push(
      finding(
        "hallucinated_completion",
        "error",
        "Completion has no observable evidence",
        "The agent claimed completion without a tool result, diff, test, browser action, or artifact.",
        completion.map((e) => e.id),
        0.99,
        "Require at least one independently inspectable completion artifact.",
      ),
    );
  if (completion.length && failedTests.length)
    findings.push(
      finding(
        "hallucinated_completion",
        "error",
        "Completion conflicts with failed tests",
        "A completion claim occurs in a run containing failed tests.",
        [...completion.map((e) => e.id), ...failedTests.map((e) => e.id)],
        1,
        "Do not claim completion until the recorded verification passes.",
      ),
    );

  const costs = trace.events
    .map((e) => e.usage?.costUsd ?? 0)
    .filter((x) => x > 0);
  const total = costs.reduce((a, b) => a + b, 0);
  const median =
    [...costs].sort((a, b) => a - b)[Math.floor(costs.length / 2)] ?? 0;
  const spike = trace.events.filter(
    (e) => (e.usage?.costUsd ?? 0) > Math.max(median * 5, 1),
  );
  if (spike.length || total > 10)
    findings.push(
      finding(
        "cost_spike",
        "warning",
        "Cost anomaly",
        `Recorded cost is $${total.toFixed(4)}; ${spike.length} event(s) exceed the deterministic spike threshold.`,
        spike.map((e) => e.id),
        0.88,
        "Set per-run and per-step budgets; inspect high-cost context and retries.",
      ),
    );

  const errors = trace.events.filter(
    (e) => e.kind === "error" || e.status === "failed",
  );
  const recovered = errors.filter((error) =>
    trace.events.some(
      (e) => e.timestamp > error.timestamp && e.status === "succeeded",
    ),
  );
  if (errors.length && !recovered.length && trace.status === "success")
    findings.push(
      finding(
        "failed_recovery",
        "error",
        "Errors were not visibly recovered",
        "The trace is marked successful, but no later successful event demonstrates recovery.",
        errors.map((e) => e.id),
        0.9,
        "Record the recovery action and its verification before marking success.",
      ),
    );
  if (trace.status === "unknown" || (!trace.endedAt && trace.events.length > 0))
    findings.push(
      finding(
        "premature_termination",
        "warning",
        "Run has no definitive termination",
        "The trace lacks a definitive final status or end timestamp.",
        trace.events.slice(-1).map((e) => e.id),
        0.92,
        "Emit a terminal event with explicit outcome and reason.",
      ),
    );

  const searches = calls.filter((e) =>
    /search|find|query|navigate/i.test(e.name ?? ""),
  );
  if (searches.length >= 4) {
    const first = new Set(
      JSON.stringify(searches[0]?.input)
        .toLowerCase()
        .match(/[a-z0-9]{4,}/g) ?? [],
    );
    const last = JSON.stringify(searches.at(-1)?.input).toLowerCase();
    if (![...first].some((term) => last.includes(term)))
      findings.push(
        finding(
          "retrieval_drift",
          "warning",
          "Retrieval appears to drift",
          "Later retrieval calls no longer share a substantive term with the first retrieval.",
          [searches[0]!.id, searches.at(-1)!.id],
          0.75,
          "Carry explicit task constraints into each retrieval step.",
        ),
      );
  }
  return findings;
}
