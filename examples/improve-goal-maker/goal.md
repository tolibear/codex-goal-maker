# Improve Goal Maker

## Objective

Improve the local Goal Maker skill by discovering the highest-leverage repo-backed changes, completing the first safe implementation tranche, and leaving a reviewable handoff for anything larger.

## Goal Kind

`open_ended`

## Current Tranche

Map the current Goal Maker implementation, identify concrete improvement candidates with verification paths, select one small and reversible tranche, implement it, verify it, and finish with an audit receipt.

## Non-Negotiable Constraints

- Keep Goal Maker v2 control-file semantics intact: `goal.md`, `state.yaml`, and `notes/` only at each goal root.
- Do not implement from assumptions; Scout evidence or Judge selection must precede Worker edits.
- Preserve compatibility with Codex agent roles and the existing checker unless a Judge task explicitly chooses otherwise.
- Keep changes small, reviewable, and backed by local verification commands.
- Do not use destructive git operations or require credentials.

## Stop Rule

Stop when the tranche audit passes, all safe local work is blocked, or continuing would require owner input, credentials, destructive operations, or strategy the board cannot decide.

## Canonical Board

Machine truth lives at:

`examples/improve-goal-maker/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow examples/improve-goal-maker/goal.md
```

## PM Loop

On every `/goal` continuation:

1. Read this charter.
2. Read `state.yaml`.
3. Work only on the active board task.
4. Assign Scout, Judge, Worker, or PM according to the task.
5. Write a compact task receipt.
6. Update the board.
7. Select the next active task or finish with a Judge/PM audit receipt.
