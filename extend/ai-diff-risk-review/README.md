# AI Diff Risk Review

Review an AI-assisted or agent-produced diff before it moves to PR handoff.

This extension is local-first. It helps a Goal Maker run inspect the original request, board receipts, changed files, verification evidence, and known risk areas so the PM can produce a concise review brief for a human reviewer. It does not approve code, post comments, or call an external model by default.

## Use When

- A Worker slice produced code or documentation changes with AI assistance.
- The team wants a human-review checklist focused on "almost right" code.
- Verification passed but the PM still needs to identify residual risk before PR handoff.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Relevant receipt notes
- `git diff --stat`
- `git diff`
- Verification command output

## Output

An AI diff risk review brief with:

- Reviewer summary
- Changed surface map
- Highest-risk assumptions
- Verification coverage
- Missing or weak evidence
- Suggested reviewer focus areas
- Blocked follow-up work, if any

## Boundaries

- `state.yaml` remains authoritative.
- Passing verification is evidence, not approval.
- No external model, review API, or GitHub comment is called by default.
- Live PR comments or automated approval require a separate explicitly approved extension.
