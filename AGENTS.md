# AGENTS.md

Goal Maker is an npm package that installs a Codex skill. Keep the repo layout and package boundary clear.

## Repo Shape

- `goal-maker/` is the installable Codex skill payload.
- `goal-maker/scripts/` stays inside the skill because installed skill instructions call those scripts.
- `internal/` is package and development infrastructure, not skill content.
- `extend/` and `extend/catalog.json` are the GitHub-hosted extension surface.
- `examples/` contains completed sample Goal Maker runs.

## Improvement Surfaces

When improving this repo, consider README, `goal-maker/SKILL.md`, templates, checker behavior, CLI UX, examples, package contents, extension catalog shape, and `extend/` documentation. Do not assume a request only touches code.

## Package Rules

- Keep the runtime dependency-free unless there is a strong reason.
- Keep `goal-maker/` installable as a Codex skill directory.
- Keep package-only CLI and tests under `internal/`.
- Do not commit local `docs/goals/` run artifacts unless explicitly requested.
- Run `npm run check` before claiming implementation is complete.
