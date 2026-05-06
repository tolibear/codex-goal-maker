# AGENTS.md

GoalBuddy is an npm package that installs a Codex skill. Keep the repo layout and package boundary clear.

## Repo Shape

- `goalbuddy/` is the canonical installable Codex skill payload.
- `goal-maker/` is the temporary compatibility skill payload for existing users.
- `goalbuddy/scripts/` and `goal-maker/scripts/` stay inside the skills because installed skill instructions call those scripts.
- `internal/` is package and development infrastructure, not skill content.
- `plugins/goalbuddy/` is the repo-local Codex plugin package scaffold.
- `extend/` and `extend/catalog.json` are the GitHub-hosted extension surface.
- `examples/` contains completed sample GoalBuddy runs.

## Improvement Surfaces

When improving this repo, consider README, `goalbuddy/SKILL.md`, the temporary `goal-maker/` compatibility payload, templates, checker behavior, CLI UX, plugin UX, examples, package contents, extension catalog shape, and `extend/` documentation. Do not assume a request only touches code.

## Package Rules

- Keep the runtime dependency-free unless there is a strong reason.
- Keep `goalbuddy/` installable as the canonical Codex skill directory.
- Keep `goal-maker/` working as a temporary compatibility skill directory until the migration window ends.
- Keep package-only CLI and tests under `internal/`.
- Do not commit local `docs/goals/` run artifacts unless explicitly requested.
- Run `npm run check` before claiming implementation is complete.
