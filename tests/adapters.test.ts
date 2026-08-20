import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { adapters, importTrace } from "../src/adapters/index.js";
import { parseJsonOrJsonl } from "../src/adapters/sdk.js";

const context = { fileName: "x.jsonl", importedAt: "2026-01-01T00:00:00.000Z" };
describe("adapters", () => {
  it("auto-detects Codex rollout JSONL", async () => {
    const input = parseJsonOrJsonl(
      await readFile("examples/offline-demo.codex.jsonl", "utf8"),
    );
    const result = importTrace(input, context);
    expect(result.adapter.id).toBe("codex");
    expect(result.trace.events.some((x) => x.kind === "tool_call")).toBe(true);
  });
  it("parses Gemini OpenTelemetry spans", () => {
    const input = {
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                {
                  id: "s",
                  name: "tool_call",
                  startTimeUnixNano: "1767225600000000000",
                  attributes: [
                    {
                      key: "gen_ai.tool.name",
                      value: { stringValue: "shell" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = importTrace(input, context, "gemini-cli");
    expect(result.trace.events[0]?.name).toBe("shell");
  });
  it("parses Browser Use history", () => {
    const input = {
      task: "browse",
      history: [
        {
          timestamp: "2026-01-01T00:00:00Z",
          state: { url: "https://example.com" },
          model_output: {
            action: [{ go_to_url: { url: "https://example.com" } }],
          },
          result: [{ extracted_content: "ok" }],
        },
      ],
    };
    const result = importTrace(input, context, "browser-use");
    expect(result.trace.events.map((x) => x.kind)).toContain("browser_action");
  });
  it("preserves generic and experimental unknown fields", () => {
    const input = [
      {
        id: "1",
        type: "custom",
        timestamp: "2026-01-01T00:00:00Z",
        strange: 42,
      },
    ];
    expect(
      importTrace(input, context, "generic-jsonl").trace.events[0]?.attributes
        ?.originalType,
    ).toBe("custom");
    expect(adapters.filter((x) => x.stability === "experimental")).toHaveLength(
      3,
    );
  });
});
