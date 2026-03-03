# Lessons Learned — Antigravity Autonomous Engine

This file is maintained by the autonomous agents as part of the self-improvement loop.
Each entry records a context, what went wrong (or right), and the lesson extracted.
Agents read this file before each run to avoid repeating past mistakes.

---

## 2026-03-03 — Bootstrap

**Context:** Initial engine setup.

**Lesson:** The Antigravity engine was initialised. All agents, safety config, and the GitHub Actions workflow are in place. Future agents should:
- Always read `.agent-safety.yml` before modifying any files.
- Check `todo.md` for the current backlog before starting work.
- Append a lesson here after any non-trivial run, success or failure.
- Keep PRs small (< 500 lines) and focused on a single task.
- Never modify `.env` files or commit secrets.

---

## How to add a lesson

Agents append entries automatically via `scripts/agents/_shared.ts:appendLesson()`.
Humans may also add entries manually following the format:

```markdown
## YYYY-MM-DD — AgentName

**Context:** Brief description of what the agent was doing.

**Lesson:** What was learned, what to do differently next time.
```
