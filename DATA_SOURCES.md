# Data sources

TraceFact v0.1 ships no third-party raw trajectories and no private data.

| Data                          | Source URL                                       | Snapshot / commit                          | Retrieved  | License    | Included?             |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------ | ---------- | ---------- | --------------------- |
| TraceFact-60                  | `scripts/generate-dataset.ts` in this repository | release commit                             | 2026-08-20 | CC0-1.0    | 60 small JSON traces  |
| Codex format research         | https://github.com/openai/codex                  | `d75c85f65139aa9245a96d05642a0a5d2bae436a` | 2026-08-20 | Apache-2.0 | No upstream data/code |
| Gemini CLI format research    | https://github.com/google-gemini/gemini-cli      | `e90c63fa158b8facd1872d32b34b07e516308f2b` | 2026-08-20 | Apache-2.0 | No upstream data/code |
| Browser Use format research   | https://github.com/browser-use/browser-use       | `85ddbfedf609166b2d2c76c3d80506649fee82a9` | 2026-08-20 | MIT        | No upstream data/code |
| OpenCode format research      | https://github.com/anomalyco/opencode            | `e0e9bd7d5f2ae9bfa47dae0b82040c57207c9b24` | 2026-08-20 | MIT        | No upstream data/code |
| OpenHands format research     | https://github.com/OpenHands/OpenHands           | `f2dd33090592f8777e3f2d1a519ddb44866e595e` | 2026-08-20 | MIT        | No upstream data/code |
| agent-browser format research | https://github.com/vercel-labs/agent-browser     | default branch reviewed 2026-08-20         | 2026-08-20 | Apache-2.0 | No upstream data/code |

Future downloaders must write URL, exact commit/release, retrieval date, license, checksums, and whether a result is external/self-reported. They must default to public repositories and require an explicit opt-in for private traces.
