import type { TraceEvent } from "../core/types.js";
import { baseTrace, eventId, timestamp, type TraceAdapter } from "./sdk.js";

export const browserUseAdapter: TraceAdapter = {
  id: "browser-use",
  displayName: "Browser Use",
  version: "1.0.0",
  stability: "stable",
  detect(input) {
    const text = JSON.stringify(input).slice(0, 30000);
    return /model_output|state|result|interacted_element|browser_use/.test(
      text,
    ) && /url|action/.test(text)
      ? 0.9
      : 0;
  },
  parse(input, context) {
    const root = (input ?? {}) as Record<string, unknown>;
    const history = (root.history ??
      root.items ??
      (Array.isArray(input) ? input : [])) as Array<Record<string, unknown>>;
    const events: TraceEvent[] = [];
    history.forEach((step, index) => {
      const state = (step.state ?? {}) as Record<string, unknown>;
      const output = (step.model_output ?? {}) as Record<string, unknown>;
      const actionList = (output.action ?? output.actions ?? []) as Array<
        Record<string, unknown>
      >;
      const ts = timestamp(step.timestamp ?? state.timestamp, index);
      actionList.forEach((action, actionIndex) => {
        const [name, args] = Object.entries(action)[0] ?? [
          "browser.action",
          {},
        ];
        const arg = (args ?? {}) as Record<string, unknown>;
        events.push({
          id: `${eventId("browser", index, step)}-${actionIndex}`,
          kind: "browser_action",
          timestamp: ts,
          actor: "browser",
          name,
          status: "succeeded",
          input: args,
          browser: {
            action: name,
            ...(typeof arg.url === "string" ? { url: arg.url } : {}),
            ...(typeof arg.selector === "string"
              ? { selector: arg.selector }
              : {}),
          },
          attributes: { pageUrl: state.url, title: state.title },
        });
      });
      const results = (step.result ?? []) as Array<Record<string, unknown>>;
      results.forEach((result, resultIndex) =>
        events.push({
          id: `${eventId("browser-result", index, result)}-${resultIndex}`,
          kind: result.error ? "error" : "tool_result",
          timestamp: ts,
          actor: "browser",
          status: result.error ? "failed" : "succeeded",
          output: result.extracted_content ?? result.long_term_memory ?? result,
          ...(result.error ? { error: { message: String(result.error) } } : {}),
        }),
      );
      if (output.current_state)
        events.push({
          id: `${eventId("browser-state", index)}-state`,
          kind: "message",
          timestamp: ts,
          actor: "assistant",
          content: JSON.stringify(output.current_state),
        });
    });
    return baseTrace(this, context, events, {
      task: {
        title: String(root.task ?? context.fileName ?? "Browser Use run"),
      },
      agent: { name: "Browser Use" },
    });
  },
};
