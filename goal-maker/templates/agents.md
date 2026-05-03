# Goal Maker Agents

Use three generic agents. The main `/goal` thread remains PM and owns the board.

| Agent | model_reasoning_effort | sandbox_mode | Purpose |
|---|---:|---|---|
| goal_scout | medium | read-only | Evidence mapping and candidate tasks |
| goal_worker | low | workspace-write | One bounded implementation/recovery task |
| goal_judge | high | read-only | Strategic review, escalation, completion skepticism |

Recommended project config:

```toml
[agents]
max_threads = 4
max_depth = 1
job_max_runtime_seconds = 1800
```

Install:

```bash
mkdir -p .codex/agents
cp .codex/skills/goal-maker/agents/goal_*.toml .codex/agents/
```

Rules:

- Only the PM loop chooses active tasks, marks tasks done, or completes the goal.
- Keep at most one write-capable Worker active unless disjoint write scopes are explicit in `state.yaml`.
- Scout and Judge are read-only.
- Judge is high thinking.
