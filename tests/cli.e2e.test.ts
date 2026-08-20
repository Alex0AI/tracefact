import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const tsx = resolve(root, "node_modules/tsx/dist/cli.mjs");
const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporary.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

describe("CLI end to end", () => {
  it("analyzes, exports, and verifies the offline fixture", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "tracefact-e2e-"));
    temporary.push(workspace);
    const output = join(workspace, "report");
    const analyzed = await exec(
      process.execPath,
      [
        tsx,
        "src/cli.ts",
        "analyze",
        "examples/offline-demo.codex.jsonl",
        "--out",
        output,
      ],
      { cwd: root },
    );
    expect(analyzed.stdout).toContain("0 finding(s), 100% evidence coverage");

    const report = JSON.parse(
      await readFile(join(output, "report.json"), "utf8"),
    ) as { trace: { status: string } };
    expect(report.trace.status).toBe("success");
    await expect(readFile(join(output, "report.html"))).resolves.toBeTruthy();
    await expect(readFile(join(output, "report.sarif"))).resolves.toBeTruthy();

    const verified = await exec(
      process.execPath,
      [tsx, "src/cli.ts", "verify", join(output, "run.tracefact.gz")],
      { cwd: root },
    );
    expect(verified.stdout).toContain("capsule hashes match");
  });
});
