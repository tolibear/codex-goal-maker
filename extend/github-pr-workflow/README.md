# GitHub PR Workflow

Prepare receipt-aligned commit boundaries and GitHub pull request handoff text from a Goal Maker board without making GitHub the source of truth.

This extension is intentionally local-first. It helps a goal run turn `state.yaml` receipts, verification commands, commit boundaries, and the current diff into PR-ready context. It does not create a pull request, edit GitHub issues, or sync board state back from GitHub.

## Use When

- A Goal Maker run is ready for a pull request.
- Reviewers need the original request, completed task receipts, changed files, and verification in one place.
- The branch should be decomposed into commits that map to completed Worker or PM receipts.
- The team wants a repeatable handoff format without requiring GitHub credentials during goal execution.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Any receipt notes referenced from done tasks
- `git status --short`
- `git diff --stat`
- `git log --oneline <base>..HEAD`
- Relevant verification output

## Output

A review-ready branch and Markdown PR handoff with:

- PR title
- Summary
- Goal context
- Commit plan mapped to Goal Maker receipts
- Changed files
- Verification
- Review notes
- Follow-up or blocked work

## Commit Boundaries

Use completed Worker or PM receipts as the default commit boundaries:

- One implementation slice receipt should usually become one commit.
- A commit should include the files needed for that slice to be locally coherent, including catalog/docs wiring when the slice adds an extension.
- Do not combine unrelated receipts just because they were completed in one long goal run.
- Do not split one receipt across multiple commits unless the receipt explicitly covers separate independently reviewable units.
- Preserve blocked or credential-gated behavior in commit messages or PR notes when live verification is intentionally out of scope.

See `examples/github-pr-workflow-extension/pr-handoff.md` for a complete example artifact.

## Boundaries

- `state.yaml` remains authoritative.
- GitHub PR text is a generated handoff artifact.
- Missing GitHub credentials should not block local preparation.
- Live PR creation belongs in a separate, explicitly approved workflow.
