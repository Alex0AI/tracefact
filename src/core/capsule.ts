import { gunzipSync, gzipSync } from "node:zlib";
import { analyze } from "./analyze.js";
import { sha256, stableStringify } from "./hash.js";
import { redact } from "./redact.js";
import type { AgentTrace, ReplayCapsule } from "./types.js";

export function createCapsule(
  input: AgentTrace,
  shouldRedact = true,
): Uint8Array {
  const trace = shouldRedact ? redact(input).value : input;
  const report = analyze(trace);
  const traceText = stableStringify(trace);
  const reportText = stableStringify(report);
  const capsule: ReplayCapsule = {
    capsuleVersion: "1.0.0",
    createdAt: new Date().toISOString(),
    trace,
    report,
    manifest: {
      redacted: shouldRedact,
      source: trace.source,
      ...(trace.environment ? { environment: trace.environment } : {}),
      files: [
        {
          path: "trace.json",
          sha256: sha256(traceText),
          bytes: Buffer.byteLength(traceText),
        },
        {
          path: "report.json",
          sha256: sha256(reportText),
          bytes: Buffer.byteLength(reportText),
        },
      ],
    },
  };
  capsule.manifest.capsuleHash = sha256({
    ...capsule,
    manifest: { ...capsule.manifest, capsuleHash: undefined },
  });
  return gzipSync(Buffer.from(JSON.stringify(capsule)));
}

export function readCapsule(bytes: Uint8Array): ReplayCapsule {
  const capsule = JSON.parse(
    gunzipSync(bytes).toString("utf8"),
  ) as ReplayCapsule;
  if (capsule.capsuleVersion !== "1.0.0")
    throw new Error(`Unsupported capsule version: ${capsule.capsuleVersion}`);
  const traceText = stableStringify(capsule.trace);
  const expected = capsule.manifest.files.find(
    (x) => x.path === "trace.json",
  )?.sha256;
  if (!expected || sha256(traceText) !== expected)
    throw new Error("Replay capsule integrity check failed for trace.json");
  return capsule;
}
