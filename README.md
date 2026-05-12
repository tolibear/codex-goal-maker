# GoalBuddy

<p align="center">
  <a href="https://goalbuddy.dev">
    <img src="internal/assets/goalbuddy-readme-hero.png" alt="GoalBuddy gives Claude Code and Codex a goal operating system with live boards, Scout, Judge, Worker, receipts, and verification." width="100%">
  </a>
</p>

<p align="center">
  <strong>A goal operating system for Claude Code and Codex: intake, live boards, agents, receipts, and verification.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/goalbuddy"><img alt="npm" src="https://img.shields.io/npm/v/goalbuddy?style=flat-square&color=684cff"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-071236?style=flat-square"></a>
  <a href="https://goalbuddy.dev"><img alt="goalbuddy.dev" src="https://img.shields.io/badge/site-goalbuddy.dev-684cff?style=flat-square"></a>
</p>

GoalBuddy is a local companion for **Claude Code** and **Codex** when the work is too broad to trust to a single prompt. It turns rough intent into a durable operating loop: a `goal.md` charter, a machine-readable `state.yaml` board, optional visual boards, Scout/Judge/Worker task flow, compact receipts, and verification before completion.

```bash
npx goalbuddy
```

Or install it globally:

```bash
npm i -g goalbuddy
```

Then restart your AI coding agent (Claude Code or Codex) and invoke the installed skill:

```text
/goal-prep      # in Claude Code
$goal-prep      # in Codex
```

`goal-prep` prepares the GoalBuddy board and prints the `/goal` command to run next. It does not start `/goal` automatically.

## Why GoalBuddy Exists

Long-running goals in Claude Code and Codex drift. A request like "improve this project" can turn into unbounded edits, stale verification, and premature completion claims.

GoalBuddy gives your AI coding agent a durable loop:

```text
vague goal -> Scout -> Judge -> Worker -> receipt -> verify -> repeat
```

The main `/goal` thread acts as PM. It owns the board, keeps exactly one active task, delegates when useful, records receipts, and only completes after a Judge or PM audit proves the original outcome is done.

## What You Get Locally

```text
docs/goals/<slug>/
  goal.md
  state.yaml
  notes/
```

- `goal.md` is the editable charter: objective, constraints, tranche, and stop rule.
- `state.yaml` is the board truth: task status, active task, receipts, and verification.
- `notes/` holds longer Scout, Judge, or PM findings when a task receipt would be too large.

## The Operating Model

GoalBuddy uses four primitives:

- **Charter**: states what this goal is trying to accomplish and what must stay true.
- **Board**: tracks tasks, status, receipts, and verification freshness.
- **Task**: exactly one active Scout, Judge, Worker, or PM task.
- **Receipt**: compact proof for every completed, blocked, or escalated task.

GoalBuddy bundles default agent templates. `goal-prep` records whether matching installed agent configs were actually found; if not, `/goal` can continue through PM fallback, or you can install dedicated agents with:

```bash
npx goalbuddy agents
```

- **Scout** maps repo evidence, workflows, constraints, risks, and candidate next tasks.
- **Judge** resolves ambiguity, scope, risk, task selection, and completion claims.
- **Worker** performs one bounded implementation or recovery slice with explicit files and checks.

## Install For Claude Code (Default)

Install GoalBuddy into Claude Code:

```bash
npx goalbuddy
```

This installs the GoalBuddy plugin into `~/.claude/` by default. Restart Claude Code, then run:

```text
/goal-prep
```

If you prefer a global executable:

```bash
npm i -g goalbuddy
goalbuddy
```

Check the local install:

```bash
npx goalbuddy doctor
```

## Install For Codex

GoalBuddy also installs into Codex with a single flag:

```bash
npx goalbuddy --target codex
```

Restart Codex, then use `$goal-prep`. The plugin bundles the local live board and GitHub Projects visual board backends so Goal Prep can offer a board immediately.

Native Codex `/goal` is still an under-development Codex feature. Before relying on the printed command, confirm your local Codex runtime is logged in and has goals enabled:

```bash
codex login status
codex features enable goals
npx goalbuddy doctor --goal-ready --target codex
```

Use a non-default Claude home or Codex home:

```bash
npx goalbuddy --claude-home /path/to/.claude
npx goalbuddy --target codex --codex-home /path/to/.codex
```

`plugin install`, `install`, `update`, and `doctor` also support `--json` when an agent or script needs structured output.

## Run A Goal

After `goal-prep` creates or repairs the board, start the run with the printed command:

```text
/goal Follow docs/goals/<slug>/goal.md.
```

Check board health at any time:

```bash
node ~/.claude/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml
# Or for Codex installs:
node ~/.codex/skills/goalbuddy/scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml
```

For a broad prompt like "Improve my project," the first active task should usually be Scout, not Worker:

```yaml
tasks:
  - id: T001
    type: scout
    assignee: Scout
    status: active
    objective: "Map repo health and identify improvement candidates."
    receipt: null
  - id: T002
    type: judge
    assignee: Judge
    status: queued
    objective: "Choose the next safe implementation task."
    receipt: null
  - id: T003
    type: worker
    assignee: Worker
    status: queued
    objective: "Execute the safe implementation task selected by Judge."
    allowed_files: []
    verify: []
    stop_if:
      - "Need files outside allowed_files."
      - "Verification fails twice."
    receipt: null
```

## Visual Boards

GoalBuddy can show progress as the goal runs. `goal-prep` can open a local live board inside your AI coding agent before the task list is finished, or prepare a GitHub Projects sync when stakeholders need an external board.

<p align="center">
  <img src="internal/assets/goalbuddy-live-board.jpg" alt="GoalBuddy local live board open next to Claude Code while Scout, Judge, and Worker tasks populate." width="100%">
</p>

## Extensions

The npm package is the stable core. Local Board and GitHub Projects are bundled into the installed GoalBuddy skill so `goal-prep` can offer a visual board immediately. Other optional extensions live under `extend/` and are discovered from the GitHub-hosted `extend/catalog.json`, so users do not need a new npm release for every integration.

```bash
npx goalbuddy board docs/goals/<slug>
npx goalbuddy extend github-projects
npx goalbuddy extend
npx goalbuddy extend github-pr-workflow
npx goalbuddy extend install github-pr-workflow --dry-run
```

`goalbuddy extend` shows available extensions and detail commands. `goalbuddy extend <id>` shows local install state, activation state, credential requirements, safe-by-default status, and missing environment variables.

Current catalog examples include:

- `github-pr-workflow`: prepares receipt-aligned commit and PR handoff text.
- `github-projects`: mirrors GoalBuddy boards into GitHub Projects.
- `local-goal-board`: serves a local live board that updates from `state.yaml` and `notes/`.
- `ai-diff-risk-review`: summarizes risk in the current diff.
- `ci-failure-triage`: maps failing CI back to likely causes and next tasks.
- `docs-drift-audit`: checks whether docs still match implementation.
- `codebase-onboarding-map`: creates a concise repo map from files and conventions.
- `release-readiness`: checks whether a goal is ready to publish.

Extensions can publish, report, intake, or add role guidance. They are not board truth. `state.yaml` remains authoritative.

## Compatibility Window

GoalBuddy was previously published as `goal-maker`. During the migration window, `npx goal-maker` remains available as a compatibility alias and prints the new command:

```bash
npx goalbuddy
```

Machine-readable commands such as `npx goal-maker install --json` keep JSON output clean so existing automation can migrate safely.

Release automation for future npm publishes is documented in [RELEASE.md](RELEASE.md).

## Examples

- `examples/improve-goal-maker/`: a small completed reliability run.
- `examples/extend-catalog-workflow/`: a larger run from product framing through implementation and cleanup.
- `examples/github-pr-workflow-extension/pr-handoff.md`: an extension-generated PR handoff artifact.

## Repo Map

- `goalbuddy/SKILL.md`: canonical agent-agnostic skill definition (Claude Code and Codex)
- `goalbuddy/agents/`: Scout, Judge, and Worker agent definitions (Codex TOML + Claude Code markdown)
- `goalbuddy/templates/`: `goal.md`, `state.yaml`, and `note.md`
- `goalbuddy/scripts/check-goal-state.mjs`: v2 board checker
- `internal/cli/goal-maker.mjs`: npm installer CLI for Claude Code and Codex
- `plugins/goalbuddy/`: Claude Code plugin (`.claude-plugin/`) and Codex plugin (`.codex-plugin/`) scaffolds
- `extend/` and `extend/catalog.json`: GitHub-hosted extension surface
- `examples/`: completed sample runs

## Status

`0.3.x` brings first-class Claude Code support alongside Codex. The v2 board and receipt model intentionally rejects old v1 `gate`, `units`, `artifacts`, and `evidence.jsonl` goal folders instead of auto-migrating them.

Use GoalBuddy to structure autonomous coding-agent work. Keep relying on repo-specific `AGENTS.md`/`CLAUDE.md`, tests, and CI for repo facts.

## Star History

<a href="https://www.star-history.com/?repos=tolibear%2Fgoalbuddy&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=tolibear/goalbuddy&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=tolibear/goalbuddy&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=tolibear/goalbuddy&type=date&legend=top-left" />
 </picture>
</a>

## License

MIT
