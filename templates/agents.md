# Goal Maker Agents

Use three generic agents. The main `/goal` thread remains PM and owns state.

| Agent | model_reasoning_effort | sandbox_mode | Purpose |
|---|---:|---|---|
| goal_scout | medium | read-only | Evidence mapping |
| goal_worker | low | workspace-write | One bounded implementation/recovery unit |
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
cp .agents/skills/goal-maker/assets/codex-agents/*.toml .codex/agents/
```

Rules:

- Only the PM loop chooses active units, marks units done, or completes the goal.
- Keep at most one write-capable Worker active unless disjoint write scopes are explicit in `state.yaml`.
- Scout and Judge are read-only.
- Judge is high thinking.
