# Contributing

Thanks for improving `goalbuddy`.

## Local Setup

Clone the repo and run the checks:

```bash
git clone https://github.com/tolibear/goalbuddy.git
cd goalbuddy
npm run check
```

Until the GitHub repository rename is complete, use the current local clone or the existing `tolibear/goal-maker` remote.

## Local Install Test

Use a temporary Codex home so local testing does not overwrite your real install:

```bash
tmp=$(mktemp -d)
node internal/cli/goal-maker.mjs install --codex-home "$tmp"
node internal/cli/goal-maker.mjs doctor --codex-home "$tmp"
rm -rf "$tmp"
```

## Package Check

Before opening a PR, verify the npm package contents:

```bash
npm pack --dry-run
```

The package should include `README.md`, `internal/assets/`, `package.json`, `internal/cli/`, the canonical `goalbuddy/` skill directory, the temporary `goal-maker/` compatibility skill directory, and `plugins/goalbuddy/`.

## Releases

GoalBuddy publishes from GitHub Actions with npm trusted publishing. See [RELEASE.md](RELEASE.md) before creating a release.

## Contribution Guidelines

- Keep the runtime dependency-free unless there is a strong reason.
- Keep `goalbuddy/` installable as the canonical Codex skill directory.
- Keep `goal-maker/` working as a temporary compatibility skill directory until the migration window ends.
- Prefer small, reviewable changes.
- Update README or templates when behavior changes.
- Run `npm run check` before submitting changes.
