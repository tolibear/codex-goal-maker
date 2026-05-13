# Changelog

## Unreleased

- **Hardened Codex plugin-only installs.** Codex install/update now use the native plugin path, refresh the bundled Scout/Judge/Worker agents, and leave stale personal `~/.codex/skills/goalbuddy` / `goal-maker` folders out of the expected clean state.
- **Fixed Codex doctor for plugin-only installs.** `goalbuddy doctor --target codex --goal-ready` now validates the plugin cache, bundled `$goal-prep` skill, enabled plugin config, and GoalBuddy agents instead of failing only because standalone personal skill folders are absent. The report also distinguishes native OpenAI-gated Codex `/goal` from GoalBuddy `$goal-prep` and local boards.
- **Made mutating command help safe.** `goalbuddy plugin install --help` and `goalbuddy update --help` print help without installing, updating, or touching global Codex/Claude files.

## 0.3.5 — Subgoals, Parallel Agents, and Dark Mode (2026-05-12)

- **Subgoals for bounded branching work.** Parent tasks can link to depth-1 child `state.yaml` boards under `subgoals/`, the checker validates child shape and containment, and the local board renders the child board inside the parent task detail.
- **Parallel-agent-ready boards.** `goalbuddy parallel-plan` reports safe read-only Scout/Judge handoffs and Worker handoffs only when write scopes are known and disjoint. It does not mutate state or spawn agents.
- **Dark mode and a sharper live board.** The local board now has readable dark mode, global viewer settings, compact mode, completed-task collapse, a site-aligned header, GitHub stars, and active-card motion with reduced-motion handling.
- **Multi-board local hub navigation.** Multiple local boards share one readable `goalbuddy.localhost` hub with an in-header board selector, and parent boards stream updates when linked child subgoal state changes.
- **More durable execution plumbing.** Scout/Judge/Worker contracts are stricter, `goalbuddy prompt` emits compact task prompts, Worker write-scope checks fail closed for ambiguous overlap, and source/plugin tests cover the new branching and parallel-safety surfaces.

## 0.3.2 — Harden Codex plugin cache updates (2026-05-11)

- **Fixed Codex plugin updates when stale preserved-extension folders exist.** The updater now ignores non-version cache directories like `.goalbuddy-preserved-extend-*` while selecting the active plugin skill, so a leftover temporary folder cannot make `npx goalbuddy update` fail with `Unsupported version`.
- **Stopped leaving empty preserved-extension folders during plugin reinstalls.** The updater only creates the temporary preservation directory when there is a custom extension to copy.

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
