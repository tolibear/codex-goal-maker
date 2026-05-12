# GoalBuddy Agents

This directory contains skill metadata and bundled agent definitions for Codex and Claude Code.

## Files

- `openai.yaml` stays with the skill as metadata.
- `goal_scout.toml`, `goal_judge.toml`, `goal_worker.toml` — Codex agent configs. Copy into `.codex/agents/` for project-scoped agents or `~/.codex/agents/` for personal agents.
- Claude Code agent markdown lives in `plugins/goalbuddy/agents/` (installed to `~/.claude/agents/` by `npx goalbuddy --target claude`).

## Agent Matrix

| Agent | Codex file | Claude Code file | Reasoning effort | Write scope |
|---|---|---|---:|---|
| Scout | `goal_scout.toml` | `goal-scout.md` | medium | read-only |
| Worker | `goal_worker.toml` | `goal-worker.md` | low | workspace-write |
| Judge | `goal_judge.toml` | `goal-judge.md` | high | read-only |

## Recommended Codex Config

```toml
[agents]
max_threads = 4
max_depth = 1
job_max_runtime_seconds = 1800
```

## Authority Boundary

Only the main `/goal` PM loop may select the active task, mark tasks done, update board truth, or mark the goal complete.
