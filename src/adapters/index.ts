import { browserUseAdapter } from "./browser-use.js";
import { codexAdapter } from "./codex.js";
import { experimentalAdapters } from "./experimental.js";
import { geminiAdapter } from "./gemini.js";
import { genericAdapter } from "./generic.js";
import type { AdapterContext, TraceAdapter } from "./sdk.js";

export const adapters: TraceAdapter[] = [
  codexAdapter,
  geminiAdapter,
  browserUseAdapter,
  ...experimentalAdapters,
  genericAdapter,
];

export function importTrace(
  input: unknown,
  context: AdapterContext,
  requested = "auto",
) {
  const adapter =
    requested === "auto"
      ? [...adapters].sort(
          (a, b) => b.detect(input, context) - a.detect(input, context),
        )[0]!
      : adapters.find((x) => x.id === requested);
  if (!adapter) throw new Error(`Unknown adapter: ${requested}`);
  return { trace: adapter.parse(input, context), adapter };
}

export * from "./sdk.js";
