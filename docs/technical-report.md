# TraceFact: Evidence-Linked Reliability Analysis and Reproducible Replay for Coding and Browser Agents

## Abstract

Agent runtimes expose incompatible messages, tool calls, diffs, tests, browser actions, costs, and errors. A final natural-language answer cannot establish that a task was completed, and an opaque model judge is difficult to audit. TraceFact introduces a versioned Open Agent Trace Schema, an evidence graph connecting completion claims to observable events, deterministic failure rules that cite trace positions, and a content-addressed replay capsule. The v0.1 implementation is model/provider/benchmark-neutral, runs without an API key, and exports standalone HTML, JSON, Markdown, and SARIF.

## 1. Research questions

1. Can heterogeneous agent records be normalized without erasing unknown fields?
2. Can operational completion claims be classified by inspectable supporting or conflicting evidence?
3. Can common failure modes be identified deterministically with a trace-level explanation?
4. Can a recorded run be independently reviewed without the original model, provider key, or live environment?

## 2. Method

OATS 1.0 stores task/source/agent/environment metadata and ordered observable events. Adapter-specific fields remain in `attributes` and `extensions`. The current evidence extractor recognizes explicit claim events and assistant completion language, then creates edges to prior tests, tool results, file changes, browser actions, and artifacts using causal IDs and lexical overlap. Passing tests and multiple sources strengthen a claim; failures create contradiction edges.

The failure taxonomy implements bounded rules for repeated identical calls, low-diversity tool loops, retrieval-term drift, changes with no tests, failed tests, evidence-free or conflicting completion, median/absolute cost anomalies, missing termination, and unrecovered errors. Rules emit confidence, severity, remediation, and event IDs. These values are diagnostic rule confidence, not semantic correctness probability.

Replay capsules contain redacted trace/report records, source metadata, environment summary, file entries, and SHA-256 digests, compressed with gzip. Review is a replay of recorded evidence, not re-execution of side effects.

## 3. Implementation

The strict TypeScript core has no production dependency. It supports Node 20+, Vite static deployment, a command-line interface, a read-only JSON-RPC MCP server, and a composite GitHub Action. Stable adapters cover Codex rollout JSONL, Gemini CLI OTel/log events, Browser Use histories, and generic JSONL/OTel. OpenCode, agent-browser, and OpenHands are explicitly experimental.

## 4. Experiment

TraceFact-60 contains 60 deterministic synthetic traces, ten in each of six scenario classes. `scripts/evaluate-detectors.ts` compares emitted failure codes with fixture labels and reports micro precision, recall, and F1 plus per-rule counts. Because fixture authors also authored the rules, exact or near-exact agreement is expected. The result validates determinism and regression behavior only.

The current result is micro precision 0.833, recall 1.000, and F1 0.909. The 10 counted false positives are all secondary `hallucinated_completion` findings on traces whose primary expected label is only `test_failure`; their recorded completion claim conflicts with the failing test. We retain this mismatch because it demonstrates multi-label ambiguity in failure taxonomies. Raw counts are in `docs/experiment-results.json`. We do not present them as field accuracy. A meaningful generalization study requires independently labeled, legally redistributable real traces and adjudication of ambiguous cases.

## 5. Ablation plan

The reproducible v0.1 ablation toggles evidence sources (tests, tool results, diffs, browser actions) and taxonomy rules, then measures label coverage on TraceFact-60. The small set makes statistical significance inappropriate. Future work will report per-rule precision/recall and bootstrap intervals on independently labeled runs.

## 6. Threats to validity

- Logs can be missing, fabricated, or semantically misleading; a hash proves integrity after capture, not truth at capture.
- Lexical evidence linking can miss paraphrases or create weak false links.
- A passing test may be irrelevant or insufficient.
- Provider formats evolve without notice.
- Redaction is pattern-based and cannot guarantee removal of all personal or proprietary information.
- Replay is observational, not deterministic environment re-execution.
- Synthetic labels overestimate performance and diversity.

## 7. Ethics and privacy

TraceFact defaults to local processing, has no telemetry, and includes no third-party trajectories in v0.1. Publishing a report remains a user decision. Private traces should not be uploaded merely to obtain analysis. External results must retain provenance and be marked external/self-reported when they cannot be reproduced.

## 8. Conclusion

TraceFact makes a deliberately limited claim: operational statements about an agent run become easier to falsify when they are attached to observable evidence and exact trace locations. It is not a universal correctness oracle. Its most important output is often visible uncertainty.
