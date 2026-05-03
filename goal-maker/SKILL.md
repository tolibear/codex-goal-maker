---
name: goal-maker
description: Use for broad, long-running, stalled, or unhealthy Codex work that needs autonomous task discovery, role-tagged Scout/Judge/Worker delegation, one active task, durable receipts, and a PM-owned rolling board.
---

# Goal Maker

`$goal-maker` prepares a Goal Maker board. It does not start `/goal` automatically.

Goal Maker is for autonomous, long-running Codex work where the PM thread may need to discover the work, define tasks, sequence them, delegate them, execute them, verify them, and keep going without the human decomposing every step.

The loop is:

```text
vague goal -> discovery -> task board -> one active task -> receipt -> board update -> repeat
```

## What `$goal-maker` Does

When invoked directly, prepare or repair the board and stop for user choice.

Do:

- clarify or infer the goal title and slug;
- classify the goal as `specific`, `open_ended`, `recovery`, or `audit`;
- create or repair `docs/goals/<slug>/`;
- create `goal.md`, `state.yaml`, and `notes/`;
- seed a role-tagged task board;
- make the first active task safe;
- verify Scout, Worker, and Judge agents are installed or explain what is missing;
- print the exact command `/goal Follow docs/goals/<slug>/goal.md`;
- ask whether to start now, refine `goal.md`, or stop.

Do not:

- start `/goal` automatically;
- create `evidence.jsonl`, `units/`, or `artifacts/` for new v2 goals;
- edit implementation files before the board exists;
- invent implementation tasks from vibes when a Scout or Judge task is needed first;
- treat `goal.md` as board truth when it conflicts with `state.yaml`.

## When To Use

Use this skill for goals that are broad, multi-hour, ambiguous, high-risk, already stale, already red, or likely to need Scout/Judge/Worker delegation.

For a one-change task, do not create a Goal Maker board.

## The Four Primitives

1. **Charter**: `goal.md` says what the current tranche is trying to accomplish and what constraints matter.
2. **Board**: `state.yaml` is the rolling task list and machine truth.
3. **Task**: exactly one active task may be worked at a time.
4. **Receipt**: every completed, blocked, or escalated task leaves a compact durable result on the task card.

Agents are not a separate primitive. They are the assignee type on a task.

## Control Files

For a v2 goal, create only:

```text
docs/goals/<slug>/
  goal.md
  state.yaml
  notes/
```

The goal root may contain only `goal.md`, `state.yaml`, and `notes/`.

Most results live inline as task receipts in `state.yaml`. Only create `notes/<task-id>-<slug>.md` when Scout, Judge, or PM output is too large to fit on the task card.

Use:

- `templates/goal.md`
- `templates/state.yaml`
- `templates/note.md`

## Charter

The charter answers:

```text
What are we trying to improve?
What constraints are non-negotiable?
Is this goal specific, open-ended, recovery, or audit?
What counts as enough for the current tranche?
```

Avoid forever goals. A broad goal should define a tranche, for example:

```text
Discover the highest-leverage local improvements, complete the first safe implementation tranche, and leave a reviewable handoff for anything larger.
```

## Board

`state.yaml` is the board and machine truth. A task card has:

```yaml
id: T001
type: scout | judge | worker | pm
assignee: Scout | Judge | Worker | PM
status: queued | active | blocked | done
objective: "<one sentence>"
inputs: []
constraints: []
expected_output: []
receipt: null
```

Worker tasks additionally require:

```yaml
allowed_files: []
verify: []
stop_if: []
```

The PM owns the board. Scout, Judge, and Worker return receipts; they do not select the next active task or mark the goal complete.

## Seed Boards

If the goal is vague, the first active task is Scout.

Example open-ended seed:

```yaml
tasks:
  - id: T001
    type: scout
    assignee: Scout
    status: active
    objective: "Map repo health and identify improvement candidates."
    receipt: null
  - id: T002
    type: scout
    assignee: Scout
    status: queued
    objective: "Find verification commands, flaky tests, stale docs, dependency risks, and easy safety wins."
    receipt: null
  - id: T003
    type: judge
    assignee: Judge
    status: queued
    objective: "Choose the first tranche by impact, confidence, reversibility, and verification strength."
    receipt: null
  - id: T004
    type: worker
    assignee: Worker
    status: queued
    objective: "Execute the first chosen implementation task."
    allowed_files: []
    verify: []
    stop_if:
      - "Need files outside allowed_files."
      - "Behavior is ambiguous."
      - "Verification fails twice."
    receipt: null
```

If the goal is specific but evidence is incomplete, start with Scout. If risk or priority is unclear, queue Judge before Worker. If evidence is adequate and implementation is bounded, the first active task may be Worker.

## Task Rules

A task is the only work that may happen.

- Scout tasks are read-only and produce findings.
- Judge tasks are read-only and produce decisions or constraints.
- Worker tasks may write only inside `allowed_files`.
- PM tasks may update control files and board state.

No implementation without an active Worker or PM task that explicitly allows it.

At most one write-capable Worker may be active. Do not run parallel Workers unless `state.yaml` proves disjoint write scopes and the user explicitly asked for parallel agent work.

## Receipts

A receipt is compact proof that the task happened and what it changed, learned, decided, blocked, or spawned.

Scout receipt:

```yaml
receipt:
  result: done
  summary: "Found three high-leverage candidates: flaky auth tests, missing router coverage, stale build docs."
  evidence:
    - test/auth/session.test.ts
    - src/router/index.ts
    - README.md
  spawned_tasks:
    - T004
```

Judge receipt:

```yaml
receipt:
  result: done
  decision: "Do router coverage first; defer auth flake because it is not reproducible locally."
  next_allowed_task: T004
  blocked_tasks:
    - T005
```

Worker receipt:

```yaml
receipt:
  result: done
  changed_files:
    - src/billing/router.ts
    - test/billing/router.test.ts
  commands:
    - cmd: git diff --check
      status: pass
    - cmd: npm test -- test/billing/router.test.ts
      status: pass
  summary: "invoice.paid now routes through eventRouter.dispatch; regression test added."
```

For long findings or decisions, write `notes/<task-id>-<slug>.md` and point to it:

```yaml
receipt:
  result: done
  note: notes/T001-repo-map.md
  summary: "Repo map completed; three candidate tranches found."
```

## Computed Gate

Do not store manual gate booleans.

The gate is computed from the active task:

- active Scout: edits are not allowed; receipt must include findings or a note.
- active Judge: edits are not allowed; receipt must include a decision.
- active Worker: edits are allowed only inside `allowed_files`; receipt must include changed files and commands.
- active PM: edits are limited to control files unless the task explicitly allows otherwise.

If verification is red, stale, blocked, or unknown, choose recovery, Scout, Judge, or PM board work before feature work.

## Blocked Does Not Mean Stop

Blocked tasks do not necessarily block the goal. The PM should keep doing safe local board work when possible:

- create a Scout task to improve evidence;
- create a Judge task to resolve ambiguity;
- create a Worker task for a smaller safe slice;
- write or update a note for handoff;
- update receipts and verification freshness.

Set `goal.status: blocked` only when every safe local next action is blocked, unsafe, or requires owner input.

## Continuation Rule

After a task completes, immediately write its receipt and select the next active task unless:

- the tranche audit passes;
- every safe local next action is blocked;
- owner input is required;
- continuing would require credentials, destructive operations, or product strategy outside the board.

Do not end with an active task marked done.

Run the checker when available:

```bash
node <skill-path>/scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml
```

If the checker and your judgment disagree, choose the more conservative state.

## Agents

Scout, Worker, and Judge are default-installed roles.

| Agent | Thinking level | Write access | Use for |
|---|---:|---:|---|
| Scout | medium | no | source/spec/repo evidence mapping |
| Worker | low | yes, bounded | one exact implementation or recovery task |
| Judge | high | no | strategic review, ambiguity, scope, completion skepticism |

A task's `assignee` determines the agent. The task card is the order. The receipt is the return format.

Only the main `/goal` PM may choose the active task, update the board, mark tasks done, or mark the goal complete.

## Completion

Never complete because work looks substantial.

Completion is a Judge or PM audit task. The goal is done only when a final done Judge or PM receipt says the current tranche is complete and maps completion to current receipts and verification.

Default final task:

```yaml
- id: T999
  type: judge
  assignee: Judge
  status: queued
  objective: "Audit whether the current tranche is complete."
  inputs:
    - "All done task receipts"
    - "Last verification"
    - "Current dirty diff"
  expected_output:
    - "complete | not_complete"
    - "missing evidence"
    - "next task if not complete"
  receipt: null
```

## Default `/goal` Shape

```text
/goal Follow docs/goals/<slug>/goal.md
```
