# Docs Drift Audit

Catch documentation drift before a GoalBuddy run claims completion.

This extension is local-first. It helps compare the original request, changed files, commands, exported surfaces, and README/docs references so the PM can identify stale or missing documentation. It does not rewrite docs automatically.

## Use When

- A Worker slice changes behavior, commands, public files, extension metadata, or examples.
- A final audit needs proof that docs and examples still match the implementation.
- A PR handoff should call out docs updates or intentionally unchanged docs.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Worker receipts and notes
- `git diff --stat`
- `git diff`
- README, docs, examples, and extension manifests relevant to changed files

## Output

A docs drift audit with:

- Changed behavior or surface summary
- Documentation locations checked
- Missing, stale, or intentionally unchanged docs
- Example artifact status
- Suggested docs follow-up tasks
- Completion risk

## Boundaries

- This extension reports drift; it does not silently edit docs.
- The PM or a bounded Worker task must update docs if the audit finds required changes.
- `state.yaml` remains the source of task truth.
- Passing this audit is not enough for completion unless the final Judge/PM audit maps it back to the original outcome.
