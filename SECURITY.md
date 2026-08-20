# Security policy

## Supported versions

The latest tagged minor release receives security fixes.

## Reporting

Do not open a public issue for a secret-redaction bypass, path traversal, capsule integrity bypass, or workflow injection issue. Use GitHub private vulnerability reporting on the repository Security tab. Include a minimal synthetic reproducer; never attach a real private trace.

We aim to acknowledge a report within 72 hours, provide an assessment within 7 days, and coordinate disclosure after a fix. These are targets, not service-level guarantees.

## Trust boundary

Trace files are untrusted input. The Web UI renders text through escaping; the CLI writes reports but does not execute trace commands. The MCP server is read-only and sanitizes run IDs. Redaction is defense in depth and cannot guarantee removal of every secret or personal datum—review exports before sharing.
