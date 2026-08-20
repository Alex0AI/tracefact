# Open Agent Trace Schema (OATS)

OATS `1.0.0` is an append-friendly, provider-neutral trace envelope. Unknown top-level fields and event fields are intentionally preserved in `extensions` or `attributes`. Minor producers may add fields; breaking changes require a new major schema version.

Migrate an older trace with `tracefact migrate input.json --out migrated.json`. TraceFact never interprets hidden chain-of-thought; it records observable messages, actions, results, diffs, tests, browser evidence, usage, errors, and artifact hashes.
