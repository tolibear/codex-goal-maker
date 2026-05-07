# GoalBuddy Codex Plugin

GoalBuddy packages the canonical `$goal-prep` skill as a Codex plugin so teams can install the reusable workflow as a plugin while keeping the npm CLI for local setup, doctor checks, and extension management.

## What It Contains

- `.codex-plugin/plugin.json`: plugin metadata and Codex UI copy.
- `skills/goalbuddy/`: the installable GoalBuddy skill payload.
- `assets/goalbuddy-icon.svg`: lightweight plugin icon.

## Local Testing

From the repo root:

```bash
npm run check
npx goalbuddy doctor
npx goalbuddy check-update
```

## Native Codex Install

Install and enable GoalBuddy:

```bash
npx goalbuddy
```

Restart Codex, then use `$goal-prep`. Optional extensions can be installed with:

```bash
npx goalbuddy extend install --all
```

Or install the npm package globally:

```bash
npm i -g goalbuddy
goalbuddy
```

The marketplace manifest is included for Codex discovery, but current Codex CLI builds only register the marketplace with `codex plugin marketplace add`; the npm CLI also caches and enables the plugin.

For local CLI testing before npm publish:

```bash
node internal/cli/goal-maker.mjs --catalog-url extend/catalog.json
node internal/cli/goal-maker.mjs doctor
```

## Release Notes

The plugin is prepared for the `tolibear/goalbuddy` repo and `goalbuddy` npm package. Keep `.codex-plugin/plugin.json` aligned with `package.json` before publishing a new package release.
