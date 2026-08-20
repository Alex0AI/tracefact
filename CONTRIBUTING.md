# Contributing

Thank you for improving evidence-based agent reliability.

1. Discuss substantial schema or diagnostic changes in an issue first.
2. Create a focused branch and run `npm ci && npm run check`.
3. New rules must be deterministic, document their assumptions, cite exact event IDs, and include positive plus negative fixtures.
4. New adapters must preserve unknown fields, redact test fixtures, record the upstream format URL/commit/license, and never include a private user trace.
5. Do not add an opaque aggregate judge score or mix unrelated benchmark scores.

Contributions are accepted under Apache-2.0. By submitting, you certify that you have the right to provide the work and any fixture data.
