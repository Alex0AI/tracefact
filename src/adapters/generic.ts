import type { AgentTrace, TraceEvent } from "../core/types.js";
import { baseTrace, eventId, timestamp, type TraceAdapter } from "./sdk.js";

export const genericAdapter: TraceAdapter = {
  id: "generic-jsonl",
  displayName: "Generic JSONL / OpenTelemetry",
  version: "1.0.0",
  stability: "stable",
  detect(input) {
    if ((input as AgentTrace)?.schemaVersion) return 1;
    return Array.isArray(input) ? 0.2 : 0.1;
  },
  parse(input, context) {
    if ((input as AgentTrace)?.schemaVersion) return input as AgentTrace;
    const rows = Array.isArray(input) ? input : [input];
    const events: TraceEvent[] = rows.map((row, index) => {
      const raw = (row ?? {}) as Record<string, unknown>;
      const kind = String(raw.kind ?? raw.type ?? "message");
      const allowed = [
        "message",
        "tool_call",
        "tool_result",
        "file_change",
        "test",
        "browser_action",
        "error",
        "artifact",
        "claim",
        "metric",
      ].includes(kind)
        ? (kind as TraceEvent["kind"])
        : "message";
      return {
        ...raw,
        id: eventId("event", index, raw),
        kind: allowed,
        timestamp: timestamp(raw.timestamp ?? raw.time, index),
        attributes: {
          ...((raw.attributes as Record<string, unknown>) ?? {}),
          originalType: kind,
        },
      } as TraceEvent;
    });
    return baseTrace(this, context, events);
  },
};
