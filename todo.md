# Backlog — Antigravity Autonomous Engine

Tasks are processed by the Architect agent which generates specs in `tasks/specs/`.
The Builder agent implements specs; the Reviewer agent approves and merges PRs.

Mark items complete by changing `- [ ]` to `- [x]`.

---

## High Priority

- [ ] Set up PostgreSQL database and run initial migrations
- [ ] Configure authentication providers (credentials + GitHub OAuth)
- [ ] Implement prompt discovery page with semantic search
- [ ] Add rate limiting to all public API routes

## Medium Priority

- [ ] Add missing translation keys for all 11 supported locales
- [ ] Add JSDoc comments to all exported components in `src/components/`
- [ ] Improve test coverage for auth flows
- [ ] Set up Sentry error tracking in production
- [ ] Add OpenGraph / Twitter card meta tags to all pages
- [ ] Implement prompt import from CSV (reuse `prompts.csv`)

## Low Priority

- [ ] Add dark-mode preview to the prompt editor
- [ ] Create a public API endpoint for prompt search (read-only)
- [ ] Generate PDF documentation from PROMPTS.md
- [ ] Evaluate migrating from next-intl v4 to v5 when stable

## Agent Infrastructure

- [ ] Add SLACK_WEBHOOK_URL secret to GitHub repository settings
- [ ] Add ANTHROPIC_API_KEY secret for Claude-powered improvements
- [ ] Enable GitHub Actions on all branches matching `agent/**`
- [ ] Review and tune `.agent-safety.yml` rate limits after first full run

---

_Last updated by: Bootstrap (2026-03-03)_
