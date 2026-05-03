# goal-maker

Turn vague, long-running Codex work into a rolling task board with Scout, Judge, Worker, and receipts.

```bash
npx goal-maker
```

Then invoke the skill inside Codex:

```text
$goal-maker
```

`$goal-maker` creates a goal charter and task board, then prints the `/goal` command to run next. It does not start `/goal` automatically.

![A simple hand-drawn diagram showing a vague goal becoming a Goal Maker board with Scout, Judge, Worker, and a receipt.](assets/goal-maker-flow.png)

## What It Solves

Long Codex goals drift. The work starts vague, verification gets stale, and the agent can start implementing before it has actually discovered the right task.

Goal Maker gives Codex a small operating loop:

```text
vague goal -> discovery -> task board -> one active task -> receipt -> board update -> repeat
```

The main Codex thread is the PM. It owns the board, chooses the active task, delegates when useful, and records receipts.

## The Model

Goal Maker uses four primitives:

- **Charter**: `goal.md` states the objective, constraints, current tranche, and stop rule.
- **Board**: `state.yaml` is machine truth for tasks, status, receipts, and verification freshness.
- **Task**: exactly one active task is worked at a time.
- **Receipt**: every completed, blocked, or escalated task leaves compact proof of what happened.

Scout, Judge, and Worker are installed by default:

- **Scout** maps repo/source/spec evidence and candidate tasks.
- **Judge** resolves ambiguity, scope, risk, and completion claims.
- **Worker** performs one bounded implementation or recovery task.

## Goal Folder

For each goal, `$goal-maker` prepares:

```text
docs/goals/<slug>/
  goal.md
  state.yaml
  notes/
```

Most task results live inline as receipts in `state.yaml`. Use `notes/<task-id>-<slug>.md` only when a Scout, Judge, or PM result is too large for the task card.

For a broad prompt like “Improve my project,” the first task should usually be Scout, not Worker:

```yaml
tasks:
  - id: T001
    type: scout
    assignee: Scout
    status: active
    objective: "Map repo health and identify improvement candidates."
    receipt: null
  - id: T002
    type: judge
    assignee: Judge
    status: queued
    objective: "Choose the first safe implementation tranche."
    receipt: null
  - id: T003
    type: worker
    assignee: Worker
    status: queued
    objective: "Execute the first chosen implementation task."
    allowed_files: []
    verify: []
    stop_if:
      - "Need files outside allowed_files."
      - "Verification fails twice."
    receipt: null
```

## Commands

Install or update the skill and bundled agents:

```bash
npx goal-maker
npx goal-maker update
```

Repair only the agent definitions:

```bash
npx goal-maker agents
```

Check what is installed:

```bash
npx goal-maker doctor
```

Use a non-default Codex home:

```bash
npx goal-maker install --codex-home /path/to/.codex
```

## Running A Goal

After `$goal-maker` creates or repairs the board, start `/goal` with the printed command:

```text
/goal Follow docs/goals/<slug>/goal.md
```

Check board health:

```bash
node ~/.codex/skills/goal-maker/scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml
```

## Example

See `examples/improve-goal-maker/` for a completed Goal Maker run with a charter, board receipts, and Scout notes.

## Package Contents

- `goal-maker/SKILL.md`: the Codex skill
- `goal-maker/agents/`: Scout, Judge, and Worker definitions
- `goal-maker/templates/`: `goal.md`, `state.yaml`, and `note.md`
- `goal-maker/scripts/check-goal-state.mjs`: v2 board checker
- `goal-maker/bin/goal-maker.mjs`: npm installer CLI
- `examples/improve-goal-maker/`: completed sample run

## Status

`0.2.x` is the v2 board/receipt model. It intentionally rejects old v1 `gate`, `units`, `artifacts`, and `evidence.jsonl` goal folders instead of auto-migrating them.

Use this to structure autonomous Codex work. Keep relying on repo-specific `AGENTS.md`, tests, and CI for repo facts.
