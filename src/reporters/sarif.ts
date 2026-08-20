import type { ReliabilityReport } from "../core/types.js";

export function toSarif(report: ReliabilityReport) {
  const rules = [
    ...new Map(
      report.findings.map((f) => [
        f.code,
        {
          id: f.code,
          name: f.title,
          shortDescription: { text: f.title },
          fullDescription: { text: f.description },
          help: { text: f.remediation },
        },
      ]),
    ).values(),
  ];
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "TraceFact",
            version: report.reportVersion,
            informationUri: "https://github.com/Alex0AI/tracefact",
            rules,
          },
        },
        results: report.findings.map((f) => ({
          ruleId: f.code,
          level:
            f.severity === "error"
              ? "error"
              : f.severity === "warning"
                ? "warning"
                : "note",
          message: {
            text: `${f.description} Evidence events: ${f.evidenceEventIds.join(", ")}`,
          },
          properties: {
            confidence: f.confidence,
            traceId: report.trace.traceId,
            evidenceEventIds: f.evidenceEventIds,
          },
        })),
      },
    ],
  };
}
