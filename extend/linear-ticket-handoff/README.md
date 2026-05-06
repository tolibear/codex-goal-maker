# Linear Ticket Handoff

Prepare Linear-ready issue text from GoalBuddy receipts.

This extension is credential-gated for live Linear issue creation but useful locally without credentials. It helps a GoalBuddy run convert scoped follow-up work, blockers, verification evidence, and review notes into ticket-ready Markdown. It does not create Linear issues by default.

## Use When

- A goal produces follow-up work that should become an issue.
- A blocked task needs owner or team tracking.
- The PM needs ticket-ready acceptance criteria from receipts and verification.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Receipt notes
- Current dirty diff summary
- Verification output

## Output

A Linear-ready ticket handoff with:

- Suggested title
- Problem statement
- Context and evidence
- Acceptance criteria
- Verification commands
- Blockers or missing credentials
- Suggested labels or priority

## Configuration

Live Linear issue creation, if added later, requires:

- `LINEAR_API_KEY`

## Boundaries

- `state.yaml` remains authoritative.
- Missing Linear credentials should block only live issue creation, not local handoff text.
- This extension does not create issues by default.
- Live issue creation requires explicit approval and a separate Worker task.
