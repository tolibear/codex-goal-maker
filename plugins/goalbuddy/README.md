# GoalBuddy Plugin (Codex + Claude Code)

GoalBuddy packages the canonical `goal-prep` skill as a plugin so teams can install the reusable workflow in either **Codex** (default) or **Claude Code**, while keeping the npm CLI for local setup, doctor checks, and extension management.

## What It Contains

- `.codex-plugin/plugin.json`: Codex plugin manifest and Codex UI copy.
- `.claude-plugin/plugin.json`: Claude Code plugin manifest.
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

## Native Codex Install (Default)

```bash
npx goalbuddy
```

This installs and enables the native Codex plugin in `~/.codex/`. Restart Codex, then use `$goal-prep`. The plugin bundles the local live board and GitHub Projects visual board backends so Goal Prep can offer a board immediately.

## Native Claude Code Install

```bash
npx goalbuddy --target claude
```

This installs the GoalBuddy skill, the three Scout/Judge/Worker subagents, and the `/goal-prep` slash command into `~/.claude/`. Restart Claude Code, then run:

```text
/goal-prep
```

Or install the npm package globally:

```bash
npm i -g goalbuddy
goalbuddy                  # installs for Codex
goalbuddy --target claude  # installs for Claude Code
```

For local CLI testing before npm publish:

```bash
node internal/cli/goal-maker.mjs --catalog-url extend/catalog.json
node internal/cli/goal-maker.mjs doctor
```

## Release Notes

The plugin is prepared for the `tolibear/goalbuddy` repo and `goalbuddy` npm package. Keep `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json` aligned with `package.json` before publishing a new package release.
