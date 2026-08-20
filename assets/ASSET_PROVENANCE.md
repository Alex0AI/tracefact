# Asset provenance

- `logo.svg` and `web/mark.svg`: original deterministic vector artwork authored for TraceFact.
- `dashboard.png`: screenshot of the real local TraceFact dashboard after loading `examples/offline-demo.codex.jsonl`, captured 2026-08-20 in the Codex in-app browser. No mock data beyond the documented offline fixture.
- `social-preview.png`: original bitmap generated 2026-08-20 with the built-in OpenAI image generation tool from a TraceFact-specific prompt. It contains no third-party logos or source artwork. Final prompt requested a 2:1 deep ink-green social preview with the exact text “TraceFact” and “Evidence, not vibes, for agent runs.”, an abstract claim-to-evidence graph, content/hash/check motifs, mint/cyan accents, and no robots, purple gradients, stock imagery, fake metrics, GitHub chrome, or watermark.
- `terminal-demo.gif`: deterministic animation rendered by `scripts/render-terminal-gif.py` from the actual `demo-output/report.json` produced by the bundled offline Codex fixture. Text is revealed over time for readability; no command result is fabricated.
