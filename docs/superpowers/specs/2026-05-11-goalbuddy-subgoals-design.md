# GoalBuddy Sub-Goals Design

## Goal

Add a simple sub-goal feature to GoalBuddy so a parent task can delegate a bounded uncertainty loop to a child board without turning GoalBuddy into recursive project management software.

The v1 primitive is:

> A parent task may link to one depth-1 child GoalBuddy board. The child board is rendered inside the parent task detail and rolls up through one parent receipt.

## Context

GoalBuddy v2 currently has one authoritative `state.yaml` per goal. The parent PM owns board truth, keeps one active task, delegates Scout/Judge/Worker-shaped work, and records receipts. Scout, Judge, and Worker return receipts; they do not select the next task or mark goals complete.

Sub-goals should preserve that operating model. They are useful when a task contains its own discovery, decision, execution, and verification loop. They are not needed for ordinary step lists or small implementation slices.

## Design Principles

- Keep the parent board authoritative.
- Limit nesting to depth 1 in v1.
- Let all agent roles propose sub-goals.
- Let only the PM create, activate, reject, or roll up sub-goals.
- Render sub-goals from files; do not add UI mutation controls in v1.
- Make sub-goals quiet on the parent board and detailed only when a user expands the parent task.

## State Model

Parent tasks may include an optional `subgoal` block:

```yaml
tasks:
  - id: T004
    type: worker
    assignee: Worker
    status: active
    objective: "Build the sub-goal board view."
    allowed_files:
      - extend/local-goal-board/scripts/lib/goal-board.mjs
      - extend/local-goal-board/test/local-goal-board.test.mjs
    verify:
      - node --test extend/local-goal-board/test/*.test.mjs
    stop_if:
      - "Need files outside allowed_files."
      - "Child work needs broader product or state-schema decisions."
    subgoal:
      status: active # active | blocked | done
      path: subgoals/T004-board-view/state.yaml
      owner: Worker
      created_from: T004
      depth: 1
      rollup_receipt: null
    receipt: null
```

Child state lives under the parent goal root:

```text
docs/goals/<goal-slug>/
  goal.md
  state.yaml
  notes/
  subgoals/
    T004-board-view/
      state.yaml
      notes/
```

The child `state.yaml` uses normal GoalBuddy v2 task semantics. It is an execution artifact, not a second source of parent completion truth.

## Proposal Flow

All agent roles may propose sub-goals in receipts:

```yaml
receipt:
  result: done
  summary: "The implementation split exposes a separate board-rendering loop."
  proposed_subgoals:
    - title: "Build sub-goal board rendering"
      reason: "Parser, modal rendering, and tests form a bounded loop."
      suggested_owner: Worker
      suggested_path: subgoals/T004-board-view/state.yaml
      scope:
        allowed_files:
          - extend/local-goal-board/scripts/lib/goal-board.mjs
          - extend/local-goal-board/test/local-goal-board.test.mjs
        verify:
          - node --test extend/local-goal-board/test/*.test.mjs
        stop_if:
          - "Need broader state-schema changes."
```

`proposed_subgoals` are advisory. A proposal does not change execution and does not appear as a parent task `subgoal` block. The PM may reject it, convert it into normal parent tasks, or promote it by writing a `subgoal` block and child state file.

## Lifecycle

1. An agent notices the active task contains a bounded uncertainty loop.
2. The agent returns a receipt with `proposed_subgoals`.
3. The PM gates the proposal against scope, allowed files, verification, stop conditions, role ownership, and depth.
4. If accepted, the PM writes the child board under `subgoals/` and links it from the parent task.
5. The child board runs as normal GoalBuddy-shaped work inside the approved envelope.
6. When child work is done or blocked, the PM writes a parent roll-up receipt and decides the parent task status.

The child cannot mark the parent task done. Parent completion requires a parent receipt.

## Scope Rules

In v1:

- A parent task may link to at most one active child board.
- Child boards must use `depth: 1`.
- Child boards must not link to further child boards.
- Child scope must stay within the parent task's envelope.
- Child Worker `allowed_files` must be a subset of or explicitly compatible with the parent task's `allowed_files`.
- Child verification must be equal to or stricter than the parent task's verification expectations.
- Child blocked state blocks the parent sub-goal, not the entire parent goal.

The checker should reject unsupported recursive nesting and invalid child paths.

## Visual Design

The local board remains flat by default.

Parent task cards show a small badge when `subgoal` exists:

- `sub-goal active`
- `sub-goal blocked`
- `sub-goal done`

Clicking the parent task opens the existing task detail modal. If a linked child board exists, the modal renders a full read-only mini board with the same columns as the parent board:

- Todo
- In Progress
- Blocked
- Completed

The modal also shows the child path, owner, depth, and roll-up receipt state. There are no UI controls for accepting, activating, blocking, or rolling up sub-goals in v1. The UI only renders file state.

## Validation

`check-goal-state.mjs` should validate:

- `subgoal.status` is one of `active`, `blocked`, or `done`.
- `subgoal.path` stays inside the parent goal root.
- `subgoal.depth` is `1`.
- The child state file exists whenever a `subgoal` block exists.
- Child state is valid GoalBuddy v2 state.
- Child state does not contain its own `subgoal` blocks.
- A done parent task still requires a parent receipt.
- A done child board does not imply the parent task is done.

## Implementation Surfaces

Likely files:

- `goalbuddy/templates/state.yaml`
- `goalbuddy/SKILL.md`
- `goalbuddy/scripts/check-goal-state.mjs`
- `extend/local-goal-board/scripts/lib/goal-board.mjs`
- `extend/local-goal-board/test/local-goal-board.test.mjs`
- `extend/local-goal-board/examples/*/state.yaml`
- mirrored plugin-bundled copies under `plugins/goalbuddy/skills/goalbuddy/`

The implementation should keep proposal parsing limited to receipts. Once a parent task has a `subgoal` block, the linked child file is required.

## Tests

Add tests for:

- Parent board payload includes sub-goal metadata.
- Parent card renders a sub-goal badge.
- Expanded task detail renders the linked child board.
- Missing child state fails validation.
- Proposed sub-goals in receipts do not create parent-card badges.
- Recursive child sub-goal fails validation.
- Done child board does not let a parent task complete without parent receipt.

## Non-Goals

- No arbitrary recursive goals.
- No global tree view.
- No drag-and-drop or UI mutation controls.
- No multiple child boards per parent task in v1.
- No separate completion authority for child boards.
- No new agent autonomy beyond proposal receipts.

## Deferred Questions

- Should parent tasks support multiple historical child boards after v1, or should old children be represented only through receipts?
- Should GitHub Projects sync show child boards, or only the parent badge and roll-up receipt?

The recommended v1 answer is conservative: one child board per parent task, and external sync shows only parent badges plus roll-up receipts.
