# Codebase Onboarding Map

Create a concise map of how a repository is organized and how to work in it.

This extension is local-first. It helps a GoalBuddy run turn repo files, commands, conventions, and recent receipts into an onboarding artifact for developers or future agents. It does not edit project docs by default.

## Use When

- A developer or agent is starting work in an unfamiliar repo.
- A broad goal needs an evidence-backed repo map before implementation.
- Reviewers need to understand package boundaries, commands, and conventions.

## Inputs

- `README.md`
- `AGENTS.md`
- `package.json` or equivalent manifests
- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Existing examples, docs, and test directories
- Relevant receipt notes

## Output

A codebase onboarding map with:

- Repo purpose
- Important directories and ownership boundaries
- Common commands
- Verification and release gates
- Local conventions
- Known risks or stale areas
- Recommended first files to inspect

## Boundaries

- This extension produces an onboarding artifact; it does not refactor or rewrite docs automatically.
- Generated maps should cite concrete files and commands.
- The PM should create a bounded Worker task for any docs changes suggested by the map.
