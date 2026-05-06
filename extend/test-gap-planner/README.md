# Test Gap Planner

Turn a changed diff and Goal Maker receipts into a focused test plan.

This extension is local-first. It helps a Goal Maker run identify behavior that changed, tests that already ran, edge cases that remain weakly covered, and the smallest next tests worth adding. It does not write tests automatically.

## Use When

- A Worker slice changes behavior but verification only covers the happy path.
- A Judge or PM needs to decide whether implementation proof is strong enough.
- A contributor needs a reviewable test plan before adding more tests.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Worker receipts and notes
- `git diff --stat`
- `git diff`
- Existing test files relevant to the changed surface
- Verification command output

## Output

A test gap plan with:

- Changed behavior summary
- Existing test coverage evidence
- Missing edge cases
- Suggested smallest next tests
- Manual checks, if automated tests are not practical
- Completion risk

## Boundaries

- This extension plans tests; it does not edit test files.
- A bounded Worker task must implement any required tests.
- Passing existing tests is not treated as full coverage unless the plan maps tests to the changed behavior.
