# Changelog

## 0.3.0 — Claude Code first

GoalBuddy is now built first and foremost for **Claude Code**, with Codex remaining fully supported alongside it.

### Highlights

- **Claude Code is the new default install target.** Running `npx goalbuddy` installs the GoalBuddy skill, the three Scout/Judge/Worker subagents, and the `/goal-prep` slash command into `~/.claude/`.
- **Codex remains a first-class target.** Use `npx goalbuddy --target codex` (or set `CODEX_HOME`) to install the existing Codex plugin payload, agents, and marketplace manifest exactly as before.
- **New Claude Code plugin scaffold** at `plugins/goalbuddy/.claude-plugin/plugin.json`, with markdown subagents (`agents/goal-scout.md`, `agents/goal-judge.md`, `agents/goal-worker.md`) and a `/goal-prep` command (`commands/goal-prep.md`).
- **`/goal-prep` (Claude Code) and `$goal-prep` (Codex)** are now documented as siblings throughout the skill, README, site, and CLI.
- **Reframed README, site, plugin docs, and SKILL.md** to position the workflow as a goal operating system for any AI coding agent, with Claude Code listed first.
- **CLI is target-aware.** New flags: `--target claude|codex`, `--claude-home <path>`. Existing `--codex-home` and `CODEX_HOME` continue to work and imply Codex unless `--target claude` is set explicitly.
- **Doctor checks both targets.** `goalbuddy doctor` defaults to Claude Code; `goalbuddy doctor --target codex` keeps the existing Codex runtime/agent checks.

### Compatibility

- `npx goal-maker` continues to work as a temporary alias and prints the new command.
- All existing Codex behaviors are preserved under `--target codex`.
- The shared `goalbuddy/SKILL.md` payload is unchanged in shape; only the framing is bilingual now.

### Tests

- All 44 tests pass on this release.
- Added platform-agnostic help-text expectations.
- Fixed patch-version arithmetic in `check-publish-version` tests so it tolerates minor-version bumps.

### Migration

If you previously installed via `npx goalbuddy`, your existing Codex install in `~/.codex/skills/goalbuddy/` is untouched. To install into Claude Code as well, run:

```bash
npx goalbuddy            # installs for Claude Code
npx goalbuddy --target codex   # reinstalls for Codex
```
