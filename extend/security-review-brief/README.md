# Security Review Brief

Prepare a local security review brief from changed files and GoalBuddy receipts.

This extension is local-first. It helps a GoalBuddy run check security-sensitive surfaces such as auth, secrets, user input, file paths, network calls, dependencies, and public endpoints. It does not call a scanner or external security service by default.

## Use When

- A Worker slice touches auth, permissions, secrets, user input, file operations, dependency handling, or public APIs.
- A final audit needs explicit security evidence.
- Reviewers need focused security questions for a PR.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Worker receipts and notes
- `git diff --stat`
- `git diff`
- Security-relevant project docs or policies
- Verification command output

## Output

A security review brief with:

- Security-sensitive changed surfaces
- Trust boundary notes
- Secrets and credential handling
- Input/file/network risks
- Dependency or supply-chain risks
- Missing verification or reviewer questions

## Boundaries

- This extension does not approve a change as secure.
- It does not run network scanners or upload code.
- Findings that require code changes must become bounded Worker tasks.
