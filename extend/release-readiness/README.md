# Release Readiness

Check whether a package, app, or extension change is ready to release.

This extension is local-first. It helps a GoalBuddy run assemble release evidence from changed files, package metadata, verification commands, docs, examples, and follow-up risks. It does not publish a release or change versions by default.

## Use When

- A goal changes package contents, CLI behavior, extension catalog entries, or release-facing docs.
- The PM needs a pre-release gate before tagging, publishing, or PR handoff.
- Reviewers need one place to inspect verification, docs, packaging, and rollback notes.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Worker receipts and notes
- `package.json` or equivalent manifest
- Changelog or release notes, when present
- `git diff --stat`
- Verification command output

## Output

A release readiness brief with:

- Release scope
- Package or artifact changes
- Verification status
- Docs and example status
- Version/changelog status
- Rollback or follow-up notes
- Publish blockers

## Boundaries

- This extension does not run `npm publish`, create tags, or push branches.
- Destructive or external release actions require explicit approval and a separate Worker task.
- Missing credentials or release authority should block publish work, not local readiness checks.
