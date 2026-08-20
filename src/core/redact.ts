const rules: Array<[string, RegExp]> = [
  [
    "api-key",
    /\b(?:sk|pk|ghp|github_pat|AIza|xox[baprs])-?[A-Za-z0-9_-]{12,}\b/g,
  ],
  ["bearer", /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi],
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["cookie", /\b(?:cookie|set-cookie)\s*[:=]\s*[^\s;,]+/gi],
  ["windows-path", /\b[A-Za-z]:\\Users\\[^\\\s]+/g],
  ["unix-home", /\/(?:home|Users)\/[^/\s]+/g],
];

export interface RedactionResult<T> {
  value: T;
  counts: Record<string, number>;
}

export function redactText(
  input: string,
  counts: Record<string, number> = {},
): string {
  let output = input;
  for (const [label, pattern] of rules) {
    output = output.replace(pattern, () => {
      counts[label] = (counts[label] ?? 0) + 1;
      return `[REDACTED:${label}]`;
    });
  }
  return output;
}

export function redact<T>(value: T): RedactionResult<T> {
  const counts: Record<string, number> = {};
  const walk = (item: unknown, key = ""): unknown => {
    if (
      /token|secret|password|api.?key|cookie|authorization/i.test(key) &&
      typeof item === "string"
    ) {
      counts["sensitive-field"] = (counts["sensitive-field"] ?? 0) + 1;
      return "[REDACTED:sensitive-field]";
    }
    if (typeof item === "string") return redactText(item, counts);
    if (Array.isArray(item)) return item.map((entry) => walk(entry));
    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.entries(item).map(([k, v]) => [k, walk(v, k)]),
      );
    }
    return item;
  };
  return { value: walk(value) as T, counts };
}
