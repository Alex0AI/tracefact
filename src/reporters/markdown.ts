import type { ReliabilityReport } from "../core/types.js";

const pct = (n: number) => `${Math.round(n * 100)}%`;
export function toMarkdown(report: ReliabilityReport): string {
  const { trace, metrics, evidenceGraph, findings } = report;
  return `# TraceFact reliability report

**${trace.task.title}** · ${trace.agent.name} · \`${trace.traceId}\`

| Signal | Result |
| --- | ---: |
| Run status | ${trace.status} |
| Evidence coverage | ${pct(metrics.evidenceCoverage)} |
| Reproducibility | ${pct(metrics.reproducibility)} |
| Tool calls / failures | ${metrics.toolCalls} / ${metrics.toolFailures} |
| Cost | $${metrics.costUsd.toFixed(4)} |
| Duration | ${(metrics.durationMs / 1000).toFixed(2)}s |
| Integrity | \`${report.integrity.traceHash.slice(0, 16)}…\` |

## Evidence graph

- Supported: ${evidenceGraph.summary.supported}
- Weak: ${evidenceGraph.summary.weak}
- Unsupported: ${evidenceGraph.summary.unsupported}
- Conflicting: ${evidenceGraph.summary.conflicting}

${evidenceGraph.claims.length ? evidenceGraph.claims.map((c) => `- **${c.strength}** — ${c.text} (${c.evidenceIds.length} evidence link${c.evidenceIds.length === 1 ? "" : "s"})`).join("\n") : "_No explicit completion claims were detected._"}

## Findings

${findings.length ? findings.map((f) => `### ${f.severity.toUpperCase()}: ${f.title}\n\n${f.description}\n\nEvidence: ${f.evidenceEventIds.map((id) => `\`${id}\``).join(", ")}\n`).join("\n") : "No deterministic failure rule fired."}

## Uncertainty

${metrics.uncertainty.length ? metrics.uncertainty.map((x) => `- ${x}`).join("\n") : "- No known telemetry gaps."}

> TraceFact reports observable evidence and deterministic diagnostics. It does not claim semantic correctness and does not substitute an opaque LLM-as-judge score.
`;
}
