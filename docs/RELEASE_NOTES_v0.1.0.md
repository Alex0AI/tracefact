# TraceFact v0.1.0 — Evidence, not vibes, for agent runs

The first public release turns Codex, Gemini CLI, Browser Use, JSONL, and OpenTelemetry traces into evidence-linked, locally generated reliability reports.

Highlights:

- inspect a real or included offline trace in under 60 seconds;
- see which observable events support or contradict completion claims;
- localize nine common failure modes with exact event IDs;
- share a standalone HTML report or hash-verified replay capsule;
- add the same checks to CI via SARIF and a GitHub Action;
- query local history from a read-only MCP server.

The bundled 60-trace experiment is intentionally described as deterministic synthetic regression, not production accuracy. Real-world validation and promotion of experimental adapters remain roadmap items.

Requirements: Node.js 20 or newer. No Docker, GPU, model download, API key, or account is required.
