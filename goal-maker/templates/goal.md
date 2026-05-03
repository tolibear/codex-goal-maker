# <Goal Title>

## Objective

<User-editable objective. Keep this bounded to the current tranche, not an infinite mission.>

## Goal Kind

`specific | open_ended | recovery | audit`

## Current Tranche

<What is enough for this run before stopping, auditing, or asking the owner whether to continue?>

## Non-Negotiable Constraints

- <Constraint, safety rule, compatibility rule, or owner preference.>

## Stop Rule

Stop when the tranche audit passes, all safe local work is blocked, or continuing would require owner input, credentials, destructive operations, or strategy the board cannot decide.

## Canonical Board

Machine truth lives at:

`docs/goals/<slug>/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/<slug>/goal.md
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
