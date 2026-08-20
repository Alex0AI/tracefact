# Changelog

All notable changes follow Keep a Changelog; versions follow Semantic Versioning.

## [0.1.2] - 2026-08-20

### Fixed

- Read the CLI version from package metadata instead of a hard-coded string.

### Added

- Cross-platform CLI process test covering analyze, report output, capsule verification, and recovered status.

## [0.1.1] - 2026-08-20

### Fixed

- Treat a final successful observable result as recovery instead of leaving the whole run failed.
- Keep regenerated dataset snapshots byte-stable in CI.

### Added

- Reproducible CLI demo GIF generated from the real bundled offline report.

## [0.1.0] - 2026-08-20

### Added

- OATS 1.0 JSON Schema, strict types, migration, and examples.
- Evidence Graph with four evidence states and cited edges.
- Nine deterministic failure diagnostics.
- Redacted, SHA-256-verified gzip Replay Capsule.
- Codex, Gemini CLI, Browser Use, and generic JSONL/OTel adapters; three experimental adapters.
- CLI, drag-and-drop dashboard, standalone reports, read-only MCP server, and GitHub Action.
- TraceFact-60 deterministic dataset, experiment, cross-platform CI, Pages, and community documentation.

[0.1.0]: https://github.com/Alex0AI/tracefact/releases/tag/v0.1.0
[0.1.1]: https://github.com/Alex0AI/tracefact/releases/tag/v0.1.1
[0.1.2]: https://github.com/Alex0AI/tracefact/releases/tag/v0.1.2
