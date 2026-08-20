# Research landscape and naming record

Reviewed 2026-08-20 (Asia/Shanghai). Star counts are time-sensitive discovery signals, not research results.

## Name decision

Candidates included TraceWeave, TraceWeft, AgentScope, TraceProof, RunWitness, VeraRun, and TraceFact. Search found direct or material conflicts for TraceWeave (PyPI agent-observability package), TraceWeft (Rust agent tracing), AgentScope (established agent framework), TraceProof, RunWitness, and VeraRun (ORNL tooling). **TraceFact** had no exact GitHub repository result, and both `https://registry.npmjs.org/tracefact` and `https://pypi.org/pypi/tracefact/json` returned 404. General web search returned no active software brand with the same name. This is a practical collision check, not trademark clearance.

## Agent projects inspected

| Project                                                       | Stars at review | License    | Relevant public surface            | Adapter decision                            |
| ------------------------------------------------------------- | --------------: | ---------- | ---------------------------------- | ------------------------------------------- |
| [OpenCode](https://github.com/anomalyco/opencode)             |         199,319 | MIT        | typed session messages and parts   | Experimental: storage/API has moved rapidly |
| [Browser Use](https://github.com/browser-use/browser-use)     |         109,801 | MIT        | `AgentHistoryList` serialization   | Stable                                      |
| [OpenAI Codex](https://github.com/openai/codex)               |         106,934 | Apache-2.0 | persisted rollout JSONL            | Stable                                      |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli)     |         106,586 | Apache-2.0 | documented OpenTelemetry telemetry | Stable                                      |
| [OpenHands](https://github.com/OpenHands/OpenHands)           |          84,527 | MIT        | action/observation event streams   | Experimental                                |
| [agent-browser](https://github.com/vercel-labs/agent-browser) |          40,972 | Apache-2.0 | JSON command output                | Experimental                                |

Pinned implementation sources reviewed: Codex `d75c85f` rollout recorder/thread types; Gemini CLI `e90c63f` telemetry docs/types; Browser Use `85ddbfed` agent views; OpenCode `e0e9bd7d` message-v2 types; OpenHands `f2dd3309` event-related sources. TraceFact uses public interfaces and independently written mapping code; it copies no implementation.

## Observability landscape

LangSmith, Langfuse, Arize Phoenix, AgentOps, OpenLLMetry/Traceloop, and OpenTelemetry/OpenInference already cover important collection, tracing, prompt/LLM monitoring, evaluation, and hosted collaboration. TraceFact's intended gap is narrower:

1. post-hoc inspection of coding and browser agent runs rather than only application spans;
2. explicit completion-claim to observable-evidence edges;
3. deterministic failure findings that cite trace event IDs;
4. portable redacted replay without the original provider or key;
5. local static browser analysis and standalone reports;
6. no universal leaderboard across incomparable benchmarks.

The design is complementary: OTel is an input, SARIF is an output, and hosted trace systems can remain the system of record.

## Research hypothesis

An evidence graph plus deterministic trace diagnostics will be more falsifiable and reproducible than a single opaque judge score for operational questions such as “was a change tested?”, “did the run loop?”, and “does the completion claim conflict with recorded outcomes?” It does not solve semantic correctness; that limitation is structural and explicit.
