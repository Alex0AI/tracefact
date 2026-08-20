# Three-minute demo script

**0:00–0:25 — Problem.** “Agent runs usually end with a confident sentence. That sentence does not tell us whether a file changed, tests passed, a browser action succeeded, or the agent looped. Each runtime logs these facts differently.”

**0:25–0:50 — Input.** Open TraceFact. Drag `examples/offline-demo.codex.jsonl` onto the page. “This is a normal Codex rollout. It stays in the browser; there is no account, API key, or model call.”

**0:50–1:30 — Evidence.** Point to evidence coverage and the graph. “TraceFact extracts the completion claim and links it to prior tool results. It distinguishes supporting, weak, absent, and conflicting evidence. Click an event to inspect the exact raw record.”

**1:30–2:00 — Failure localization.** Switch to a loop fixture from `dataset/generated`. “The rule does not just say ‘loop score 0.8’; it cites the eight calls and explains the bounded condition that fired.”

**2:00–2:30 — Replay.** Run `tracefact analyze …`, then `tracefact verify report/run.tracefact.gz`. “The capsule is redacted, gzip-compressed, and content-addressed. A reviewer needs neither the original model nor the API key.”

**2:30–3:00 — Research honesty.** “The initial 60-trace result is synthetic regression evidence, not production accuracy. TraceFact does not mix unrelated benchmark scores and does not use a single opaque LLM judge. The next milestone is independently labeled real-world traces with explicit redistribution consent.”
