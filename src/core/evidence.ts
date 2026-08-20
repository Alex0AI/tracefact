import type {
  AgentTrace,
  EvidenceClaim,
  EvidenceEdge,
  EvidenceGraph,
  EvidenceStrength,
  TraceEvent,
} from "./types.js";

const completionWords =
  /\b(done|completed|fixed|implemented|verified|passed|success(?:ful(?:ly)?)?)\b/i;
const evidenceKinds = new Set([
  "tool_result",
  "file_change",
  "test",
  "browser_action",
  "artifact",
]);

function claimText(event: TraceEvent): string[] {
  const text =
    event.content ?? (typeof event.output === "string" ? event.output : "");
  if (
    event.kind === "claim" ||
    (event.kind === "message" &&
      event.actor === "assistant" &&
      completionWords.test(text))
  ) {
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(
        (part) =>
          part.length > 5 &&
          (event.kind === "claim" || completionWords.test(part)),
      )
      .slice(0, 8);
  }
  return [];
}

function terms(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9_./-]{3,}/g) ?? []);
}

export function buildEvidenceGraph(trace: AgentTrace): EvidenceGraph {
  const evidence = trace.events.filter((event) =>
    evidenceKinds.has(event.kind),
  );
  const claims: EvidenceClaim[] = [];
  const edges: EvidenceEdge[] = [];
  for (const event of trace.events) {
    for (const [index, text] of claimText(event).entries()) {
      const id = `${event.id}:claim:${index}`;
      const claimTerms = terms(text);
      const candidates = evidence
        .filter((item) => {
          if (item.timestamp > event.timestamp) return false;
          const serial = JSON.stringify(item);
          const overlap = [...claimTerms].filter((term) =>
            serial.toLowerCase().includes(term),
          ).length;
          return (
            overlap > 0 ||
            item.parentId === event.parentId ||
            event.parentId === item.id
          );
        })
        .slice(-5);
      const failedIndexes = candidates
        .map((item, i) =>
          item.status === "failed" || (item.test?.failed ?? 0) > 0 ? i : -1,
        )
        .filter((i) => i >= 0);
      const lastFailure = failedIndexes.at(-1) ?? -1;
      const recoveredAfterFailure = candidates.some(
        (item, i) => i > lastFailure && item.status === "succeeded",
      );
      const conflicting = lastFailure >= 0 && !recoveredAfterFailure;
      for (const item of candidates) {
        const isConflict =
          item.status === "failed" ||
          item.test?.failed === 1 ||
          (item.test?.failed ?? 0) > 1;
        edges.push({
          claimId: id,
          evidenceId: item.id,
          relation: isConflict ? "contradicts" : "supports",
          reason: isConflict
            ? "Recorded result conflicts with completion claim."
            : "Observable result shares task terms or causal parent.",
          weight: isConflict ? -1 : item.kind === "test" ? 1 : 0.7,
        });
      }
      const strength: EvidenceStrength = conflicting
        ? "conflicting"
        : candidates.length >= 2 ||
            candidates.some(
              (x) => x.kind === "test" && x.status === "succeeded",
            )
          ? "supported"
          : candidates.length
            ? "weak"
            : "unsupported";
      claims.push({
        id,
        text,
        sourceEventId: event.id,
        strength,
        evidenceIds: candidates.map((x) => x.id),
        explanation:
          strength === "supported"
            ? "Backed by multiple observable events or a passing test."
            : strength === "weak"
              ? "Related evidence exists, but it does not independently verify the claim."
              : strength === "conflicting"
                ? "At least one recorded result contradicts the claim."
                : "No observable supporting event was found before the claim.",
      });
    }
  }
  const summary = { supported: 0, weak: 0, unsupported: 0, conflicting: 0 };
  for (const claim of claims) summary[claim.strength]++;
  return { claims, evidence, edges, summary };
}
