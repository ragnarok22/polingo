# Security Policy

## Supported Versions

We support the latest release of `polingo` and the most recent minor versions of the core packages published on npm. Older releases will only receive security fixes at the maintainers' discretion.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately:

- Email: me@reinierhernandez.com
- GitHub Security Advisory (preferred): https://github.com/ragnarok22/polingo/security/advisories/new

Provide a detailed description, affected versions, reproduction steps, and any potential impact. You will receive an acknowledgement within 48 hours.

## Disclosure Process

1. We reproduce and triage the issue.
2. A fix is developed and validated (tests, `pnpm typecheck`, `pnpm lint`, `make security`).
3. A coordinated disclosure timeline is agreed with the reporter (default target: 14 days).
4. A patched release is published and the advisory is made public, including mitigation steps.

We may request additional time for complex issues or when coordination with the broader ecosystem is required.
