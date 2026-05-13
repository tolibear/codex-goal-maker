# Deep Intake Dry Run

## Objective

Prepare a GoalBuddy board through the Deep Intake route for a broad request that needs alignment before execution.

## Original Request

The user wants to improve a broad feature, but needs the goal sharpened before work starts.

## Intake Summary

- Input shape: `open_ended`
- Audience: maintainers and future `/goal` PM sessions
- Authority: `requested`
- Proof type: `artifact`
- Completion proof: the generated board passes both `check-goal-state.mjs` and `check-deep-intake-artifacts.mjs`, with the Deep Intake notes routed into execution.
- Likely misfire: the board looks plausible but loses the user's resolved decisions, so `/goal` executes a generic improvement instead of the agreed target.
- Blind spots considered: proof surface, scope, non-goals, first active task, and final audit rejection criteria.
- Deep Intake notes: `notes/raw-input.md`, `notes/discussion.md`, and `notes/quality.md`.

## Goal Prep Compiler Source

This board was compiled against the current sibling `goal-prep/SKILL.md`, Goal Prep templates, and Goal Prep checkers. Deep Intake adds alignment notes, source bundle, trace, and artifact validation; it does not replace Goal Prep's board conventions.

## Deep Intake Source Bundle

Before selecting, advancing, or auditing tasks, the `/goal` PM must read:

- `notes/raw-input.md`
- `notes/discussion.md`
- `notes/quality.md`

These notes are source material for the board, not optional background.

## Deep Intake Trace

| User wording or resolved decision | Board choice |
|---|---|
| "sharpen the goal first" | T001 is read-only Scout validation, not implementation. |
| "preserved decisions" | T001 and T999 both read the Deep Intake notes. |
| "generic valid board is the likely misfire" | T999 rejects completion if the final result contradicts Deep Intake decisions or anti-pattern fences. |

## Success Criteria

- `goal.md` embeds the resolved Deep Intake decisions instead of only linking to notes.
- `state.yaml` keeps normal GoalBuddy v2 structure and has exactly one active task.
- T001 and T999 both read `notes/raw-input.md`, `notes/discussion.md`, and `notes/quality.md`.

## Anti-Patterns (do NOT do)

- Do not treat the user's broad request as permission to implement immediately.
- Do not drop the likely misfire during final audit.
- Do not create a divergent Deep Intake schema outside GoalBuddy's normal files.

## Non-Negotiable Constraints

- Use GoalBuddy v2 `state.yaml` conventions.
- Keep all Deep Intake records under `notes/`.
- Run both GoalBuddy checkers before printing the handoff.

## Canonical Board

Machine truth lives at:

`docs/goals/deep-intake-dry-run/state.yaml`

## Run Command

```text
/goal Follow docs/goals/deep-intake-dry-run/goal.md.
```
