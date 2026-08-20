# Decisions

## D-001 — Name: TraceFact

Selected after GitHub, npm, PyPI, and web collision checks. See `docs/research-landscape.md`.

## D-002 — Static-first TypeScript

One strict TypeScript codebase serves CLI, library, MCP, Action, and Vite dashboard. This keeps the clean install below 200 MB, avoids Docker/WSL/browser images, and allows full offline analysis after dependency installation.

## D-003 — Apache-2.0

Permissive adoption plus an explicit patent grant fits developer infrastructure. Dataset fixtures are separately CC0-1.0.

## D-004 — Rules before model judges

The initial taxonomy is deterministic and event-cited. Model-based semantic evaluators may later be optional plugins, but may not replace observable evidence or be presented as ground-truth accuracy.

## D-005 — Three stable adapters

Codex rollout JSONL, Gemini CLI telemetry, and Browser Use history have inspectable public structures. OpenCode, agent-browser, and OpenHands are marked experimental until real-world fixture compatibility is versioned and continuously tested.

## D-006 — Synthetic initial dataset

Sixty deterministic traces are safer to redistribute and fully reproducible. They are useful for regression/coverage, not claims of field performance. Public real-trace additions require license and privacy review.

## D-007 — No universal reliability score

Reports expose separate evidence, reproducibility, recovery, cost, and efficiency metrics. TraceFact does not collapse incomparable benchmarks into one leaderboard.
