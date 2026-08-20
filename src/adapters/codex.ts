import type { TraceEvent } from "../core/types.js";
import { baseTrace, eventId, timestamp, type TraceAdapter } from "./sdk.js";

export const codexAdapter: TraceAdapter = {
  id: "codex",
  displayName: "OpenAI Codex",
  version: "1.0.0",
  stability: "stable",
  detect(input) {
    const text = JSON.stringify(input).slice(0, 20000);
    return /session_meta|response_item|event_msg|function_call_output/.test(
      text,
    )
      ? 0.99
      : /codex/i.test(text)
        ? 0.5
        : 0;
  },
  parse(input, context) {
    const rows = Array.isArray(input) ? input : [input];
    const events: TraceEvent[] = [];
    const calls = new Map<string, { name: string; input: unknown }>();
    let meta: Record<string, unknown> = {};
    rows.forEach((row, index) => {
      const raw = (row ?? {}) as Record<string, unknown>;
      const payload = (raw.payload ?? raw) as Record<string, unknown>;
      const type = String(raw.type ?? payload.type ?? "message");
      if (type === "session_meta") {
        meta = payload;
        return;
      }
      const ts = timestamp(raw.timestamp ?? payload.timestamp, index);
      const item = (payload.item ?? payload) as Record<string, unknown>;
      const itemType = String(item.type ?? type);
      if (/function_call_output|tool_result/.test(itemType)) {
        const output = String(item.output ?? item.content ?? "");
        const callId = String(item.call_id ?? "");
        const call = calls.get(callId);
        const command = JSON.stringify(call?.input ?? "");
        const failed = /\b(?:[1-9]\d*\s+failed|error|failure)\b/i.test(output);
        if (/\b(?:test|pytest|vitest|jest)\b/i.test(command)) {
          const passed = Number(output.match(/(\d+)\s+passed/i)?.[1] ?? 0);
          const failedCount = Number(
            output.match(/(\d+)\s+failed/i)?.[1] ?? (failed ? 1 : 0),
          );
          events.push({
            id: eventId("codex", index, item),
            kind: "test",
            timestamp: ts,
            actor: "tool",
            name: call?.name ?? "test",
            status: failedCount ? "failed" : "succeeded",
            test: { command, passed, failed: failedCount, output },
            attributes: { codexType: itemType, callId },
          });
        } else
          events.push({
            id: eventId("codex", index, item),
            kind: "tool_result",
            timestamp: ts,
            actor: "tool",
            name: String(item.name ?? item.call_id ?? "tool"),
            status: failed ? "failed" : "succeeded",
            output: item.output ?? item.content,
            attributes: { codexType: itemType },
          });
      } else if (/function_call|custom_tool_call|tool_call/.test(itemType)) {
        const name = String(item.name ?? "tool");
        const inputValue = item.arguments ?? item.input;
        calls.set(String(item.call_id ?? item.id ?? index), {
          name,
          input: inputValue,
        });
        events.push({
          id: eventId("codex", index, item),
          kind: "tool_call",
          timestamp: ts,
          actor: "assistant",
          name,
          status: "started",
          input: inputValue,
          attributes: { codexType: itemType, callId: item.call_id },
        });
      } else if (itemType === "file_change")
        events.push({
          id: eventId("codex", index, item),
          kind: "file_change",
          timestamp: ts,
          actor: "tool",
          name: String(item.path ?? "file"),
          status: "succeeded",
          file: {
            path: String(item.path ?? "unknown"),
            operation: "update",
            ...(typeof item.diff === "string" ? { diff: item.diff } : {}),
          },
          ...(typeof item.content === "string"
            ? { content: item.content }
            : {}),
          attributes: { codexType: itemType },
        });
      else if (itemType === "test")
        events.push({
          id: eventId("codex", index, item),
          kind: "test",
          timestamp: ts,
          actor: "tool",
          name: String(item.command ?? "test"),
          status: Number(item.failed ?? 0) > 0 ? "failed" : "succeeded",
          test: {
            command: String(item.command ?? ""),
            passed: Number(item.passed ?? 0),
            failed: Number(item.failed ?? 0),
            ...(typeof item.output === "string" ? { output: item.output } : {}),
          },
          attributes: { codexType: itemType },
        });
      else if (itemType === "browser_action")
        events.push({
          id: eventId("codex", index, item),
          kind: "browser_action",
          timestamp: ts,
          actor: "browser",
          name: String(item.action ?? "browser"),
          status: "succeeded",
          browser: {
            action: String(item.action ?? "browser"),
            ...(typeof item.url === "string" ? { url: item.url } : {}),
          },
          attributes: { codexType: itemType },
        });
      else if (/error/.test(itemType))
        events.push({
          id: eventId("codex", index, item),
          kind: "error",
          timestamp: ts,
          actor: "system",
          status: "failed",
          error: {
            message: String(
              item.message ?? item.error ?? item.content ?? "Codex error",
            ),
          },
          attributes: { codexType: itemType },
        });
      else {
        const rawRole = String(
          item.role ?? (/user_message/.test(itemType) ? "user" : "assistant"),
        );
        const role: NonNullable<TraceEvent["actor"]> = [
          "user",
          "assistant",
          "system",
          "tool",
          "browser",
        ].includes(rawRole)
          ? (rawRole as NonNullable<TraceEvent["actor"]>)
          : "assistant";
        const content =
          typeof item.content === "string"
            ? item.content
            : JSON.stringify(item.content ?? item.message ?? item);
        events.push({
          id: eventId("codex", index, item),
          kind: /task_complete|agent_message/.test(itemType)
            ? "claim"
            : "message",
          timestamp: ts,
          actor: role,
          content,
          attributes: { codexType: itemType },
        });
      }
    });
    const git = (meta.git ?? {}) as Record<string, unknown>;
    return baseTrace(this, context, events, {
      traceId: String(meta.id ?? meta.session_id ?? `codex-${Date.now()}`),
      task: {
        title: String(
          meta.task ?? meta.prompt ?? context.fileName ?? "Codex run",
        ),
      },
      agent: {
        name: "OpenAI Codex",
        ...(typeof meta.cli_version === "string"
          ? { version: meta.cli_version }
          : {}),
        ...(typeof meta.model === "string" ? { model: meta.model } : {}),
      },
      environment: {
        ...(typeof meta.cwd === "string" ? { cwd: meta.cwd } : {}),
        ...(Object.keys(git).length
          ? {
              git: {
                ...(typeof git.repository_url === "string"
                  ? { repository: git.repository_url }
                  : {}),
                ...(typeof git.commit_hash === "string"
                  ? { commitSha: git.commit_hash }
                  : {}),
              },
            }
          : {}),
      },
    });
  },
};
