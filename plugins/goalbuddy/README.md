# GoalBuddy Plugin (Claude Code + Codex)

GoalBuddy packages the canonical `goal-prep` skill as a plugin so teams can install the reusable workflow in either **Claude Code** (default) or **Codex**, while keeping the npm CLI for local setup, doctor checks, and extension management.

## What It Contains

- `.claude-plugin/plugin.json`: Claude Code plugin manifest.
- `.codex-plugin/plugin.json`: Codex plugin manifest and Codex UI copy.
- `skills/goalbuddy/`: the installable GoalBuddy skill payload (shared by both platforms).
- `agents/`: Claude Code subagent definitions (`goal-scout.md`, `goal-judge.md`, `goal-worker.md`).
- `commands/goal-prep.md`: Claude Code slash command entry point.
- `assets/goalbuddy-icon.svg`: lightweight plugin icon.

## Local Testing

From the repo root:

```bash
npm run check
npx goalbuddy doctor
npx goalbuddy check-update
```

## Native Claude Code Install (Default)

```bash
npx goalbuddy
```

This installs the GoalBuddy plugin into `~/.claude/` by default. Restart Claude Code, then run:

```text
/goal-prep
```

The plugin bundles the local live board and GitHub Projects visual board backends so Goal Prep can offer a board immediately.

## Native Codex Install

```bash
npx goalbuddy --target codex
```

Restart Codex, then use `$goal-prep`. The same plugin payload is wired through the Codex marketplace manifest.

Or install the npm package globally:

```bash
npm i -g goalbuddy
goalbuddy                # installs for Claude Code
goalbuddy --target codex
```

For local CLI testing before npm publish:

```bash
node internal/cli/goal-maker.mjs --catalog-url extend/catalog.json
node internal/cli/goal-maker.mjs doctor
```

## Release Notes

The plugin is prepared for the `tolibear/goalbuddy` repo and `goalbuddy` npm package. Keep `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` aligned with `package.json` before publishing a new package release.
