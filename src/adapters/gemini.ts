import type { TraceEvent } from "../core/types.js";
import { baseTrace, eventId, timestamp, type TraceAdapter } from "./sdk.js";

export const geminiAdapter: TraceAdapter = {
  id: "gemini-cli",
  displayName: "Gemini CLI",
  version: "1.0.0",
  stability: "stable",
  detect(input) {
    const text = JSON.stringify(input).slice(0, 30000);
    return /gemini_cli|gemini-cli|gen_ai\.tool|ToolCall|tool_call_decision/.test(
      text,
    )
      ? 0.98
      : /resourceSpans|scopeSpans/.test(text)
        ? 0.55
        : 0;
  },
  parse(input, context) {
    const roots = Array.isArray(input) ? input : [input];
    const spans: Record<string, unknown>[] = [];
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        if (
          "name" in obj &&
          ("startTimeUnixNano" in obj ||
            "timestamp" in obj ||
            "eventName" in obj)
        )
          spans.push(obj);
        Object.values(obj).forEach(collect);
      }
    };
    collect(roots);
    const events: TraceEvent[] = spans.map((span, index) => {
      const attrs = Object.fromEntries(
        (
          (span.attributes as Array<Record<string, unknown>> | undefined) ?? []
        ).map((a) => [
          String(a.key),
          (a.value as Record<string, unknown> | undefined)?.stringValue ??
            (a.value as Record<string, unknown> | undefined)?.intValue ??
            a.value,
        ]),
      );
      const name = String(
        span.name ?? span.eventName ?? attrs["event.name"] ?? "gemini.event",
      );
      const ts = timestamp(
        span.timestamp ??
          (typeof span.startTimeUnixNano === "string"
            ? Number(BigInt(span.startTimeUnixNano) / 1_000_000n)
            : undefined),
        index,
      );
      const failed = String(span.status ?? attrs["status"] ?? "")
        .toLowerCase()
        .includes("error");
      if (/tool/i.test(name))
        return {
          id: eventId("gemini", index, span),
          kind: /result|response|completed/i.test(name)
            ? "tool_result"
            : "tool_call",
          timestamp: ts,
          actor: /result|response|completed/i.test(name) ? "tool" : "assistant",
          name: String(attrs["gen_ai.tool.name"] ?? attrs["tool_name"] ?? name),
          status: failed
            ? "failed"
            : /result|response|completed/i.test(name)
              ? "succeeded"
              : "started",
          input: attrs["tool_args"] ?? attrs["input"],
          output: attrs["tool_result"] ?? attrs["output"],
          attributes: attrs,
        } as TraceEvent;
      if (/error|exception/i.test(name))
        return {
          id: eventId("gemini", index, span),
          kind: "error",
          timestamp: ts,
          actor: "system",
          status: "failed",
          error: { message: String(attrs["exception.message"] ?? name) },
          attributes: attrs,
        };
      return {
        id: eventId("gemini", index, span),
        kind: /message|prompt|response/i.test(name) ? "message" : "metric",
        timestamp: ts,
        actor: /prompt|user/i.test(name) ? "user" : "assistant",
        name,
        content:
          typeof attrs["content"] === "string" ? attrs["content"] : undefined,
        status: failed ? "failed" : "succeeded",
        usage: {
          inputTokens: Number(
            attrs["gen_ai.usage.input_tokens"] ??
              attrs["input_token_count"] ??
              0,
          ),
          outputTokens: Number(
            attrs["gen_ai.usage.output_tokens"] ??
              attrs["output_token_count"] ??
              0,
          ),
          latencyMs: Number(attrs["duration_ms"] ?? 0),
        },
        attributes: attrs,
      } as TraceEvent;
    });
    return baseTrace(this, context, events, {
      agent: { name: "Gemini CLI", provider: "Google" },
    });
  },
};
