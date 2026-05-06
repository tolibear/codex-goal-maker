# <Goal Title>

## Objective

<User-editable objective. Keep this bounded to the current tranche, not an infinite mission.>

## Original Request

<Shortest faithful copy of what the user asked for. Preserve user-provided plan details here or summarize them under Intake Summary.>

## Intake Summary

- Input shape: `vague | specific | existing_plan | recovery | audit`
- Audience: <beneficiary or unknown>
- Authority: `requested | approved | inferred | needs_approval | blocked`
- Proof type: `test | demo | artifact | metric | review | source_backed_answer | decision`
- Completion proof: <observable signal that closes the full original outcome>
- Likely misfire: <how Goal Maker could succeed at the wrong thing>
- Blind spots considered: <risks, unstated choices, or success dimensions surfaced during diagnostic intake>
- Existing plan facts: <user-provided steps/files/constraints/sequencing to preserve and validate, or none>

## Goal Kind

`specific | open_ended | existing_plan | recovery | audit`

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
/goal Follow docs/goals/<slug>/goal.md. First read the intake, original request, constraints, authority, proof, likely misfire, and state.yaml board truth. Then continue through successive safe verified implementation slices until the full original outcome is complete. Preserve and validate any user-provided plan instead of discarding it or executing it blindly. Do not stop after intake, planning, Judge selection, a single verified slice, missing credentials, missing owner input, missing production access, or a blocked execute path. After each Worker slice is verified and audited, immediately advance the board to the next highest-leverage safe Worker slice and continue in the same run. If a slice is blocked by credentials, input, production access, destructive operations, or policy, mark that exact slice blocked with a receipt, create the smallest safe follow-up or workaround task, and continue all other local, non-destructive work.
```

## PM Loop

On every `/goal` continuation:

1. Read this charter.
2. Read `state.yaml`.
3. Re-check the intake: original request, input shape, authority, proof, blind spots, existing plan facts, and likely misfire.
4. Work only on the active board task.
5. Assign Scout, Judge, Worker, or PM according to the task.
6. Write a compact task receipt.
7. Update the board.
8. If Judge selected a safe Worker task with `allowed_files`, `verify`, and `stop_if`, activate it and continue unless blocked.
9. Treat a slice audit as a checkpoint, not completion, unless it explicitly proves the full original outcome is complete.
10. Finish only with a Judge/PM audit receipt that maps receipts and verification back to the original user outcome and records `full_outcome_complete: true`.
