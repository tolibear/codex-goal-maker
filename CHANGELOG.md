# Changelog

## 0.3.1 — Fix duplicate /goal-prep slash entry (2026-05-11)

- **Fixed duplicate `/goal-prep` in the Claude Code slash menu.** Previous installs shipped both a `name: goal-prep` skill and a `commands/goal-prep.md` slash command, so Claude Code listed `/goal-prep` twice with different descriptions. The skill is now the single canonical surface for `/goal-prep`. Existing installs with `~/.claude/commands/goal-prep.md` are migrated automatically: `npx goalbuddy` (and `install` / `update`) removes the legacy file. `goalbuddy doctor --target claude` reports `legacy_command_present` and fails until the legacy file is gone.

## 0.3.0 — Claude Code and Codex targets

GoalBuddy now installs into both **Codex** and **Claude Code** with a single `npx goalbuddy` run. The shared skill payload and `/goal` workflow are unchanged — this release adds a Claude Code target alongside the existing Codex one and reframes the project as "a /goal operating system for Codex and Claude Code."

### Highlights

- **One command installs both targets.** `npx goalbuddy` installs and enables the native Codex plugin in `~/.codex/`, then installs the GoalBuddy skill, three Scout/Judge/Worker subagents, and the `/goal-prep` slash command into `~/.claude/`.
- **Target-specific installs remain available.** Use `npx goalbuddy --target codex` or `npx goalbuddy --target claude` when you only want one side.
- **Claude Code plugin scaffold** at `plugins/goalbuddy/.claude-plugin/plugin.json` with markdown subagents (`agents/goal-scout.md`, `agents/goal-judge.md`, `agents/goal-worker.md`) and a `/goal-prep` command (`commands/goal-prep.md`).
- **`$goal-prep` (Codex) and `/goal-prep` (Claude Code)** are documented as sibling entry points throughout the skill, README, site, and CLI.
- **Reframed README, site, plugin docs, package.json, and SKILL.md** to position the workflow as "a /goal operating system for Codex and Claude Code."
- **CLI is target-aware.** New flags: `--target codex|claude`, `--claude-home <path>`. Existing `--codex-home` and `CODEX_HOME` continue to work unchanged.
- **Update supports both targets.** `goalbuddy update` refreshes the Codex plugin and Claude Code skill/agents/command together unless `--target` narrows it.
- **Doctor checks both targets.** Default is Codex; `goalbuddy doctor --target claude` runs the Claude Code skill/agent/command check.

### Compatibility

- `npx goalbuddy` with no flag now prepares Codex and Claude Code together. Existing Codex-only automation can keep using `--target codex` or `--codex-home`.
- `npx goal-maker` continues to work as a temporary alias and prints the new command.
- The shared `goalbuddy/SKILL.md` payload is unchanged in shape; the framing is now bilingual.

### Tests

- All 46 tests pass.
- Help-text and version-arithmetic tests updated for the bilingual usage and the 0.3.0 bump.

### Adding Or Updating Both

Install or refresh both supported agent environments:

```bash
npx goalbuddy
npx goalbuddy update
```
