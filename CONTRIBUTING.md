# Contributing

Thanks for improving `goal-maker`.

## Local Setup

Clone the repo and run the checks:

```bash
git clone https://github.com/tolibear/goal-maker.git
cd goal-maker
npm run check
```

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

The package should include `README.md`, `internal/assets/`, `package.json`, `internal/cli/`, and the installable `goal-maker/` skill directory.

## Contribution Guidelines

- Keep the runtime dependency-free unless there is a strong reason.
- Keep `goal-maker/` installable as a Codex skill directory.
- Prefer small, reviewable changes.
- Update README or templates when behavior changes.
- Run `npm run check` before submitting changes.
