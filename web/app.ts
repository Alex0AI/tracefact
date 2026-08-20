import { importTrace } from "../src/adapters/index.js";
import { parseJsonOrJsonl } from "../src/adapters/sdk.js";
import { buildEvidenceGraph } from "../src/core/evidence.js";
import { detectFailures } from "../src/core/failures.js";
import { metrics } from "../src/core/analyze.js";
import type { AgentTrace, ReliabilityReport } from "../src/core/types.js";
import { toHtml } from "../src/reporters/html.js";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );
let current: ReliabilityReport | undefined;

async function digest(trace: AgentTrace): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(trace));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function inspect(trace: AgentTrace) {
  const graph = buildEvidenceGraph(trace);
  const coverage = graph.claims.length
    ? graph.claims.filter((x) => ["supported", "weak"].includes(x.strength))
        .length / graph.claims.length
    : 0;
  current = {
    reportVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    trace,
    evidenceGraph: graph,
    findings: detectFailures(trace),
    metrics: metrics(trace, coverage),
    integrity: { algorithm: "sha256", traceHash: await digest(trace) },
  };
  render(current);
  $("report").classList.remove("hidden");
  $("report").scrollIntoView({ behavior: "smooth" });
}

function render(report: ReliabilityReport) {
  $("task").textContent = report.trace.task.title;
  $("meta").textContent =
    `${report.trace.agent.name} · ${report.trace.traceId}`;
  const items = [
    [
      "EVIDENCE COVERAGE",
      `${Math.round(report.metrics.evidenceCoverage * 100)}%`,
      report.metrics.evidenceCoverage,
    ],
    [
      "REPRODUCIBILITY",
      `${Math.round(report.metrics.reproducibility * 100)}%`,
      report.metrics.reproducibility,
    ],
    [
      "TOOL SUCCESS",
      `${report.metrics.toolCalls - report.metrics.toolFailures}/${report.metrics.toolCalls}`,
      report.metrics.toolCalls
        ? (report.metrics.toolCalls - report.metrics.toolFailures) /
          report.metrics.toolCalls
        : 0,
    ],
    [
      "RECORDED COST",
      `$${report.metrics.costUsd.toFixed(3)}`,
      Math.min(1, report.metrics.costUsd / 5),
    ],
  ] as const;
  $("metrics").innerHTML = items
    .map(
      ([label, value, ratio]) =>
        `<div class="metric"><span>${label}</span><strong>${value}</strong><div class="meter"><i style="width:${Math.round(ratio * 100)}%"></i></div></div>`,
    )
    .join("");
  $("claim-count").textContent = `${report.evidenceGraph.claims.length} claims`;
  $("event-count").textContent = `${report.trace.events.length} events`;
  $("finding-count").textContent = `${report.findings.length} findings`;
  $("claims").innerHTML =
    report.evidenceGraph.claims
      .map(
        (c) =>
          `<div class="row"><span class="tag ${c.strength}">${c.strength}</span><p>${escape(c.text)}</p><div class="mono">${c.evidenceIds.length} links · ${escape(c.explanation)}</div></div>`,
      )
      .join("") || '<div class="empty">No completion claim detected.</div>';
  $("findings").innerHTML =
    report.findings
      .map(
        (f) =>
          `<div class="row"><span class="tag ${f.severity}">${f.severity}</span><b>${escape(f.title)}</b><p>${escape(f.description)}</p><div class="mono">evidence: ${f.evidenceEventIds.map(escape).join(", ")}</div></div>`,
      )
      .join("") || '<div class="empty">No deterministic rule fired.</div>';
  $("timeline").innerHTML = report.trace.events
    .map(
      (e) =>
        `<div class="row timeline-row"><span class="kind">${e.kind}</span><span>${escape(e.name ?? e.actor ?? "event")}</span><span class="mono">${new Date(e.timestamp).toLocaleTimeString()}</span></div>`,
    )
    .join("");
  $("integrity").innerHTML =
    `sha256 ${report.integrity.traceHash}<br>schema ${escape(report.trace.schemaVersion)}<br>adapter ${escape(report.trace.source.adapter)}@${escape(report.trace.source.adapterVersion)}<br><br>${report.metrics.uncertainty.map((u) => `• ${escape(u)}`).join("<br>") || "No known telemetry gaps."}`;
}

async function readFile(file: File) {
  let text: string;
  if (file.name.endsWith(".gz")) {
    const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
    const capsule = JSON.parse(text) as { trace: AgentTrace };
    await inspect(capsule.trace);
    return;
  }
  text = await file.text();
  const input = parseJsonOrJsonl(text);
  await inspect(
    importTrace(input, {
      fileName: file.name,
      importedAt: new Date().toISOString(),
    }).trace,
  );
}

$<HTMLInputElement>("file").addEventListener("change", (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) void readFile(file);
});
const drop = $("drop");
["dragenter", "dragover"].forEach((name) =>
  drop.addEventListener(name, (event) => {
    event.preventDefault();
    drop.classList.add("over");
  }),
);
["dragleave", "drop"].forEach((name) =>
  drop.addEventListener(name, (event) => {
    event.preventDefault();
    drop.classList.remove("over");
  }),
);
drop.addEventListener("drop", (event) => {
  const file = (event as DragEvent).dataTransfer?.files[0];
  if (file) void readFile(file);
});
$("demo").addEventListener("click", async () => {
  const input = parseJsonOrJsonl(
    await (await fetch("./demo-trace.jsonl")).text(),
  );
  await inspect(
    importTrace(
      input,
      {
        fileName: "offline-demo.codex.jsonl",
        importedAt: new Date().toISOString(),
      },
      "codex",
    ).trace,
  );
});
$("export").addEventListener("click", () => {
  if (!current) return;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([toHtml(current)], { type: "text/html" }),
  );
  link.download = "tracefact-report.html";
  link.click();
  URL.revokeObjectURL(link.href);
});
