# Codex custom agents for Goal Maker

Copy these files into `.codex/agents/` for project-scoped agents or `~/.codex/agents/` for personal agents.

| Agent | File | Reasoning effort | Sandbox |
|---|---|---:|---|
| Scout | `goal_scout.toml` | medium | read-only |
| Worker | `goal_worker.toml` | low | workspace-write |
| Judge | `goal_judge.toml` | high | read-only |

Recommended config:

```toml
[agents]
max_threads = 4
max_depth = 1
job_max_runtime_seconds = 1800
```

Only the main `/goal` PM loop may select the active unit, mark units done, update gate truth, or mark the goal complete.
