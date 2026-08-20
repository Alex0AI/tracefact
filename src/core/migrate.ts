import { OATS_VERSION, type AgentTrace } from "./types.js";

export function migrateTrace(input: Record<string, unknown>): AgentTrace {
  if (input.schemaVersion === OATS_VERSION)
    return input as unknown as AgentTrace;
  if (input.schemaVersion === "0.1.0") {
    const copy = {
      ...input,
      schemaVersion: OATS_VERSION,
    } as unknown as AgentTrace;
    copy.source = {
      ...copy.source,
      adapterVersion: copy.source?.adapterVersion ?? "0.1.0",
      importedAt: copy.source?.importedAt ?? new Date().toISOString(),
    };
    copy.extensions = { ...copy.extensions, migratedFrom: "0.1.0" };
    return copy;
  }
  throw new Error(
    `No migration path for schema version ${String(input.schemaVersion)}`,
  );
}
