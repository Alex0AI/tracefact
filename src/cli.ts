#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { adapters, importTrace } from "./adapters/index.js";
import { parseJsonOrJsonl } from "./adapters/sdk.js";
import { analyze } from "./core/analyze.js";
import { createCapsule, readCapsule } from "./core/capsule.js";
import { migrateTrace } from "./core/migrate.js";
import { redact } from "./core/redact.js";
import type { AgentTrace } from "./core/types.js";
import { toHtml } from "./reporters/html.js";
import { toMarkdown } from "./reporters/markdown.js";
import { toSarif } from "./reporters/sarif.js";

const argv = process.argv.slice(2);
const command = argv.shift() ?? "help";
const option = (name: string, fallback?: string) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
};
const positional = () =>
  argv.filter(
    (value, index) =>
      !value.startsWith("--") &&
      (index === 0 || !argv[index - 1]?.startsWith("--")),
  );

async function loadTrace(path: string, adapter = "auto"): Promise<AgentTrace> {
  const bytes = await readFile(resolve(path));
  if (path.endsWith(".tracefact.gz")) return readCapsule(bytes).trace;
  const parsed = parseJsonOrJsonl(bytes.toString("utf8"));
  return importTrace(
    parsed,
    { fileName: basename(path), importedAt: new Date().toISOString() },
    adapter,
  ).trace;
}

async function main() {
  if (command === "analyze") {
    const file = positional()[0];
    if (!file)
      throw new Error(
        "Usage: tracefact analyze <trace> [--adapter auto] [--out report-dir]",
      );
    const out = resolve(option("out", "tracefact-report")!);
    const trace = redact(
      await loadTrace(file, option("adapter", "auto")),
    ).value;
    const report = analyze(trace);
    await mkdir(out, { recursive: true });
    await Promise.all([
      writeFile(join(out, "report.json"), JSON.stringify(report, null, 2)),
      writeFile(join(out, "report.md"), toMarkdown(report)),
      writeFile(
        join(out, "report.sarif"),
        JSON.stringify(toSarif(report), null, 2),
      ),
      writeFile(join(out, "report.html"), toHtml(report)),
      writeFile(join(out, "run.tracefact.gz"), createCapsule(trace)),
    ]);
    console.log(
      `TraceFact: ${report.findings.length} finding(s), ${Math.round(report.metrics.evidenceCoverage * 100)}% evidence coverage`,
    );
    console.log(`Report: ${join(out, "report.html")}`);
  } else if (command === "replay") {
    const file = positional()[0];
    if (!file)
      throw new Error(
        "Usage: tracefact replay <run.tracefact.gz> [--out report.html]",
      );
    const capsule = readCapsule(await readFile(resolve(file)));
    const out = resolve(option("out", "replay.html")!);
    await writeFile(out, toHtml(capsule.report));
    console.log(`Verified and replayed: ${out}`);
  } else if (command === "verify") {
    const file = positional()[0];
    if (!file) throw new Error("Usage: tracefact verify <run.tracefact.gz>");
    readCapsule(await readFile(resolve(file)));
    console.log("OK: capsule hashes match.");
  } else if (command === "migrate") {
    const file = positional()[0];
    if (!file)
      throw new Error(
        "Usage: tracefact migrate <trace.json> --out migrated.json",
      );
    const out = resolve(option("out", "migrated.json")!);
    await writeFile(
      out,
      JSON.stringify(
        migrateTrace(JSON.parse(await readFile(resolve(file), "utf8"))),
        null,
        2,
      ),
    );
    console.log(`Migrated: ${out}`);
  } else if (command === "adapters") {
    console.table(
      adapters.map(({ id, displayName, version, stability }) => ({
        id,
        name: displayName,
        version,
        stability,
      })),
    );
  } else if (command === "serve") {
    const dir = resolve(option("dir", "web-dist")!);
    const port = Number(option("port", "4173"));
    createServer(async (req, res) => {
      try {
        const path = join(
          dir,
          req.url === "/" ? "index.html" : req.url!.split("?")[0]!,
        );
        const body = await readFile(path);
        const type =
          extname(path) === ".html"
            ? "text/html"
            : extname(path) === ".js"
              ? "text/javascript"
              : extname(path) === ".css"
                ? "text/css"
                : "application/octet-stream";
        res.writeHead(200, { "content-type": type });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    }).listen(port, "127.0.0.1", () =>
      console.log(`TraceFact dashboard: http://127.0.0.1:${port}`),
    );
  } else {
    console.log(
      `TraceFact 0.1.0\n\nCommands:\n  analyze <trace>   normalize, diagnose, and export HTML/JSON/Markdown/SARIF/capsule\n  replay <capsule>  verify and render an offline replay\n  verify <capsule>  verify capsule integrity\n  migrate <trace>   migrate OATS schema versions\n  adapters          list adapter support\n  serve             serve the local-first dashboard`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    `TraceFact error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});

export { loadTrace, main };
