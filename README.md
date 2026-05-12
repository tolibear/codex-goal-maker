# GoalBuddy

<p align="center">
  <a href="https://goalbuddy.dev">
    <img src="internal/assets/goalbuddy-v0.3.0-release.png" alt="GoalBuddy v0.3.0 release: Claude Code support, npx goalbuddy installs into Codex and Claude Code, and npx goalbuddy update keeps both current." width="100%">
  </a>
</p>

<p align="center">
  <strong>A simple operating loop for long <code>/goal</code> runs.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/goalbuddy"><img alt="npm" src="https://img.shields.io/npm/v/goalbuddy?style=flat-square&color=684cff"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-071236?style=flat-square"></a>
  <a href="https://goalbuddy.dev"><img alt="goalbuddy.dev" src="https://img.shields.io/badge/site-goalbuddy.dev-684cff?style=flat-square"></a>
</p>

GoalBuddy helps Codex and Claude Code stay oriented during long coding tasks.

It gives `/goal` a small local workspace: a charter, a board, notes, receipts, and a clear next task. The work stays in your repo, so a run can pause, resume, verify, and keep going without re-inventing the plan every turn.

## Start Here

Run one command:

```bash
npx goalbuddy
```

Restart Codex or Claude Code.

Then prepare a goal:

```text
$goal-prep
```

In Claude Code, use:

```text
/goal-prep
```

Goal Prep creates the board and prints the exact `/goal` command to run next. That is the whole path.

## What It Creates

```text
docs/goals/<your-goal>/
  goal.md
  state.yaml
  notes/
```

`goal.md` says what you want.

`state.yaml` tracks the board.

`notes/` keeps longer findings out of the main thread.

## How It Thinks

```text
rough idea -> goal prep -> /goal -> scout -> judge -> worker -> receipt -> verify
```

Scout maps the repo.

Judge chooses the next bounded slice.

Worker changes code and leaves a receipt.

`/goal` keeps the loop honest until the original goal is actually done.

## Update

When a new GoalBuddy version ships:

```bash
npx goalbuddy update
```

That updates both Codex and Claude Code.

## Live Boards

GoalBuddy can open a local board while the work is running, so you can see the plan, active task, receipts, and verification status without digging through the chat.

<p align="center">
  <img src="internal/assets/goalbuddy-live-board.jpg" alt="GoalBuddy local live board open next to Codex while Scout, Judge, and Worker tasks populate." width="100%">
</p>

## Good For

- broad project improvements
- release prep
- bug hunts that need evidence
- refactors with verification steps
- anything too large for one prompt

## For This Repo

GoalBuddy is MIT licensed and published on npm.

The implementation lives in this repo, but the happy path is intentionally tiny: install it, run Goal Prep, then let `/goal` work from the generated files.

For release process details, see [RELEASE.md](RELEASE.md).

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
