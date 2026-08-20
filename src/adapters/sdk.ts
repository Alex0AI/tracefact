import type { AgentTrace } from "../core/types.js";

export interface AdapterContext {
  fileName?: string;
  importedAt: string;
  sourceUrl?: string;
}

export interface TraceAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly version: string;
  readonly stability: "stable" | "experimental";
  detect(input: unknown, context: AdapterContext): number;
  parse(input: unknown, context: AdapterContext): AgentTrace;
}

export function eventId(prefix: string, index: number, raw?: unknown): string {
  const explicit =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>).id
      : undefined;
  return typeof explicit === "string"
    ? explicit
    : `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

export function timestamp(raw: unknown, fallbackIndex = 0): string {
  if (typeof raw === "string" && !Number.isNaN(Date.parse(raw)))
    return new Date(raw).toISOString();
  if (typeof raw === "number")
    return new Date(raw > 10_000_000_000 ? raw : raw * 1000).toISOString();
  return new Date(Date.UTC(2026, 0, 1, 0, 0, fallbackIndex)).toISOString();
}

export function parseJsonOrJsonl(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line, index) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return { type: "raw", content: line, line: index + 1 };
        }
      });
    return rows;
  }
}

export function baseTrace(
  adapter: TraceAdapter,
  context: AdapterContext,
  events: AgentTrace["events"],
  partial: Partial<AgentTrace> = {},
): AgentTrace {
  const first = events[0]?.timestamp ?? context.importedAt;
  const last = events.at(-1)?.timestamp;
  return {
    schemaVersion: "1.0.0",
    traceId: `${adapter.id}-${first.replace(/\W/g, "").slice(0, 14)}`,
    task: {
      title: context.fileName
        ? `Imported ${context.fileName}`
        : `Imported ${adapter.displayName} run`,
    },
    startedAt: first,
    ...(last ? { endedAt: last } : {}),
    status: events.some((e) => e.status === "failed") ? "failure" : "unknown",
    source: {
      adapter: adapter.id,
      adapterVersion: adapter.version,
      format: context.fileName?.split(".").pop() ?? "json",
      importedAt: context.importedAt,
      ...(context.sourceUrl ? { url: context.sourceUrl } : {}),
    },
    agent: { name: adapter.displayName },
    events,
    ...partial,
  };
}
