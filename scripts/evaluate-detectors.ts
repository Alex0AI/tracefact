import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { detectFailures } from "../src/core/failures.js";
import type { AgentTrace, FailureCode } from "../src/core/types.js";

const index = JSON.parse(
  await readFile(resolve("dataset/index.json"), "utf8"),
) as Array<{ path: string; expectedFindings: FailureCode[] }>;
let tp = 0,
  fp = 0,
  fn = 0;
const perRule: Record<string, { tp: number; fp: number; fn: number }> = {};
for (const item of index) {
  const trace = JSON.parse(
    await readFile(resolve("dataset/generated", item.path), "utf8"),
  ) as AgentTrace;
  const actual = new Set(detectFailures(trace).map((x) => x.code));
  const expected = new Set(item.expectedFindings);
  for (const rule of new Set([...actual, ...expected])) {
    perRule[rule] ??= { tp: 0, fp: 0, fn: 0 };
    if (actual.has(rule) && expected.has(rule)) {
      tp++;
      perRule[rule]!.tp++;
    } else if (actual.has(rule)) {
      fp++;
      perRule[rule]!.fp++;
    } else {
      fn++;
      perRule[rule]!.fn++;
    }
  }
}
const precision = tp / Math.max(1, tp + fp);
const recall = tp / Math.max(1, tp + fn);
const result = {
  dataset: index.length,
  truePositive: tp,
  falsePositive: fp,
  falseNegative: fn,
  precision,
  recall,
  f1: (2 * precision * recall) / Math.max(Number.EPSILON, precision + recall),
  perRule,
  limitation:
    "These are rule-authored deterministic synthetic traces. Results measure implementation agreement with labels, not real-world generalization.",
};
await import("node:fs/promises").then(({ writeFile }) =>
  writeFile(
    resolve("docs/experiment-results.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  ),
);
console.log(JSON.stringify(result, null, 2));
