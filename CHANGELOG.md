# Changelog

## 0.3.0 — Claude Code and Codex targets

GoalBuddy now installs into both **Codex** (default) and **Claude Code** (`--target claude`). The shared skill payload and `/goal` workflow are unchanged — this release adds a Claude Code target alongside the existing Codex one and reframes the project as "a /goal operating system for Codex and Claude Code."

### Highlights

- **Codex remains the default install target.** `npx goalbuddy` keeps doing exactly what it did before: install and enable the native Codex plugin in `~/.codex/`.
- **New Claude Code target.** `npx goalbuddy --target claude` installs the GoalBuddy skill, three Scout/Judge/Worker subagents, and the `/goal-prep` slash command into `~/.claude/`.
- **Claude Code plugin scaffold** at `plugins/goalbuddy/.claude-plugin/plugin.json` with markdown subagents (`agents/goal-scout.md`, `agents/goal-judge.md`, `agents/goal-worker.md`) and a `/goal-prep` command (`commands/goal-prep.md`).
- **`$goal-prep` (Codex) and `/goal-prep` (Claude Code)** are documented as sibling entry points throughout the skill, README, site, and CLI.
- **Reframed README, site, plugin docs, package.json, and SKILL.md** to position the workflow as "a /goal operating system for Codex and Claude Code."
- **CLI is target-aware.** New flags: `--target codex|claude`, `--claude-home <path>`. Existing `--codex-home` and `CODEX_HOME` continue to work unchanged.
- **Doctor checks both targets.** Default is Codex; `goalbuddy doctor --target claude` runs the Claude Code skill/agent/command check.

### Compatibility

- `npx goalbuddy` with no flag installs for Codex exactly as before — no breaking change for existing users.
- `npx goal-maker` continues to work as a temporary alias and prints the new command.
- The shared `goalbuddy/SKILL.md` payload is unchanged in shape; the framing is now bilingual.

### Tests

- All 44 tests pass.
- Help-text and version-arithmetic tests updated for the bilingual usage and the 0.3.0 bump.

### Adding Claude Code

If you only used Codex before, your install is untouched. To also install into Claude Code:

```bash
npx goalbuddy --target claude
```
