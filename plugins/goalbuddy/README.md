# GoalBuddy Codex Plugin

GoalBuddy packages the canonical `$goalbuddy` skill as a Codex plugin so teams can install the reusable workflow as a plugin while keeping the npm CLI for local setup, doctor checks, and extension management.

## What It Contains

- `.codex-plugin/plugin.json`: plugin metadata and Codex UI copy.
- `skills/goalbuddy/`: the installable GoalBuddy skill payload.
- `assets/goalbuddy-icon.svg`: lightweight plugin icon.

## Local Testing

From the repo root:

```bash
npm run check
npx goalbuddy doctor
```

For local CLI testing before npm publish:

```bash
node internal/cli/goal-maker.mjs install --catalog-url extend/catalog.json
node internal/cli/goal-maker.mjs doctor
```

## Release Notes

The plugin is prepared for the `tolibear/goalbuddy` repo and `goalbuddy` npm package. Do not publish this plugin until the owner completes the GitHub and npm handoff steps in `docs/goals/goalbuddy-rebrand-plugin/state.yaml`.
