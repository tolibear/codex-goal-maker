# <Goal Title>

## Objective

<User-editable objective. Keep this bounded to the current tranche, not an infinite mission.>

## Goal Kind

`specific | open_ended | recovery | audit`

## Current Tranche

<What is enough for the full owner outcome, and what is the current safe slice? For execution goals, the default is continuous: discover enough evidence, choose a safe implementation slice, implement it, verify it, audit it, then immediately advance to the next safe slice until the full original outcome is complete. Plan-only or one-slice-only stopping is valid only when explicitly requested.>

## Non-Negotiable Constraints

- <Constraint, safety rule, compatibility rule, or owner preference.>

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if the user asked for working software or automation and a safe Worker task can be activated.

Do not stop after a single verified Worker slice when the broader owner outcome still has safe local follow-up slices. After each slice audit, advance the board to the next highest-leverage safe Worker task and continue.

Do not stop because a slice needs owner input, credentials, production access, destructive operations, or policy decisions. Mark that exact slice blocked with a receipt, create the smallest safe follow-up or workaround task, and continue all local, non-destructive work that can still move the goal toward the full outcome.

## Canonical Board

Machine truth lives at:

`docs/goals/<slug>/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/<slug>/goal.md continuously through successive safe verified implementation slices until the full original outcome is complete. Do not stop after planning, Judge selection, a single verified slice, missing credentials, missing owner input, missing production access, or a blocked execute path. After each Worker slice is verified and audited, immediately advance the board to the next highest-leverage safe Worker slice and continue in the same run. If a slice is blocked by credentials, input, production access, destructive operations, or policy, mark that exact slice blocked with a receipt, create the smallest safe follow-up or workaround task, and continue all other local, non-destructive work.
```

## PM Loop

On every `/goal` continuation:

1. Read this charter.
2. Read `state.yaml`.
3. Work only on the active board task.
4. Assign Scout, Judge, Worker, or PM according to the task.
5. Write a compact task receipt.
6. Update the board.
7. If Judge selected a safe Worker task with `allowed_files`, `verify`, and `stop_if`, activate it and continue unless blocked.
8. Treat a slice audit as a checkpoint, not completion, unless it explicitly proves the full original outcome is complete.
9. Finish only with a Judge/PM audit receipt that maps receipts and verification back to the original user outcome and records `full_outcome_complete: true`.
