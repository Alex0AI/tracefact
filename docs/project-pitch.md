# Project introduction

TraceFact is an open, local-first reliability layer for coding and browser agents. It normalizes heterogeneous traces, connects completion claims to concrete tests/diffs/tool/browser evidence, localizes deterministic failure modes with exact event citations, and packages runs for offline review. It complements observability platforms by answering a narrower question: what observable facts support this agent's claim that the task was completed?

## Résumé version

Designed and shipped TraceFact, an Apache-2.0 TypeScript platform for provider-neutral AI-agent reliability analysis: versioned trace schema, claim-to-evidence graph, deterministic failure taxonomy, redacted hash-verified replay capsules, CLI/Web/MCP/GitHub Action surfaces, multi-format reports, cross-platform CI, and a reproducible 60-trace regression study.

## Graduate/research framing

TraceFact studies falsifiable, evidence-linked alternatives to opaque LLM-as-judge aggregation for operational agent evaluation. Its core research artifacts are OATS 1.0, explicit evidence-strength semantics, event-cited failure rules, replay integrity, and an openly documented validity boundary.
