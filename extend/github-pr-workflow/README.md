# GitHub PR Workflow

Prepare GitHub pull request handoff text from a Goal Maker board without making GitHub the source of truth.

This extension is intentionally local-first. It helps a goal run turn `state.yaml` receipts, verification commands, and the current diff into PR-ready context. It does not create a pull request, edit GitHub issues, or sync board state back from GitHub.

## Use When

- A Goal Maker run is ready for a pull request.
- Reviewers need the original request, completed task receipts, changed files, and verification in one place.
- The team wants a repeatable handoff format without requiring GitHub credentials during goal execution.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Any receipt notes referenced from done tasks
- `git status --short`
- `git diff --stat`
- Relevant verification output

## Output

A Markdown PR handoff with:

- PR title
- Summary
- Goal context
- Changed files
- Verification
- Review notes
- Follow-up or blocked work

See `examples/github-pr-workflow-extension/pr-handoff.md` for a complete example artifact.

## Boundaries

- `state.yaml` remains authoritative.
- GitHub PR text is a generated handoff artifact.
- Missing GitHub credentials should not block local preparation.
- Live PR creation belongs in a separate, explicitly approved workflow.
