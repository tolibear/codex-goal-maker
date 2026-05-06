# CI Failure Triage

Turn failing checks into a compact diagnosis and next verification plan.

This extension is local-first. It helps a Goal Maker run summarize failed commands, CI logs, recent Worker receipts, and changed files into likely causes and next steps. It does not connect to a CI provider by default.

## Use When

- `npm run check`, test, build, lint, or CI verification fails.
- A goal needs to recover from a red verification slice.
- Reviewers need a clear explanation of failure status and next diagnostic commands.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Worker receipts and notes
- Failing command output
- Relevant local logs
- `git diff --stat`

## Output

A CI failure triage brief with:

- Failed command summary
- Suspected failure class
- Changed files likely involved
- Evidence from receipts and logs
- Next local commands to run
- Blocked external checks, if any
- Recommended board update

## Boundaries

- This extension does not mark the board complete.
- This extension does not fetch CI logs from GitHub Actions, CircleCI, Buildkite, or other providers by default.
- Provider log fetching requires a separate credentialed workflow.
- Missing live CI access should be recorded as a blocked check, not as a blocked local recovery task.
