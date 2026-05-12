# GoalBuddy 0.3.5: Subgoals, Parallel Agents, and Dark Mode

Release date: 2026-05-12

![GoalBuddy v0.3.5 release: Subgoals, parallel agents, and dark mode.](https://raw.githubusercontent.com/tolibear/goalbuddy/v0.3.5/internal/assets/goalbuddy-v0.3.5-release.png)

This is the release where GoalBuddy starts feeling less like a single board and more like a calm local workspace for serious agent work.

0.3.5 adds three big things:

- **Subgoals**: depth-1 child boards for branching work.
- **Parallel agents**: safe, explicit surfaces for parallel Scout, Judge, and bounded Worker handoffs.
- **Dark mode**: a cleaner local board that can stay open all day without punishing your eyes.

Under the hood, this release also hardens GoalBuddy's execution model: stricter agent contracts, deterministic task prompts, conservative parallel planning, stronger checker rules, and safer child-board rendering.

Update with:

```bash
npx goalbuddy update
```

## The Headline

GoalBuddy still has one simple job: keep long `/goal` runs oriented until the real outcome is done.

0.3.5 makes that loop much easier to run when the work branches, when more than one agent is helping, or when you want a live board open beside Codex or Claude Code.

The model stays intentionally small:

- `goal.md` is the charter.
- `state.yaml` is the ledger.
- A board is a view of one `state.yaml`.
- A subgoal is one depth-1 child `state.yaml` linked from a parent task.
- The local hub is navigation, not workflow truth.
- Viewer settings are preferences, not state.

## Subgoals

Subgoals give GoalBuddy a clean way to branch without turning into project-management software.

A parent task can now link to a child board under `subgoals/`:

```yaml
subgoal:
  status: active
  path: subgoals/T004-board-view/state.yaml
  owner: Worker
  created_from: T004
  depth: 1
  rollup_receipt: null
```

The local board renders that child board inside the parent task detail, so you can open one task and see the focused child workflow underneath it.

What this is good for:

- a parent task that needs a focused implementation branch
- a verification slice that deserves its own mini-board
- a Scout/Judge/Worker path that should stay bounded
- parallel work that needs a visible surface without losing the parent context

What it is not:

- recursive planning
- nested subgoals
- a separate project hierarchy
- a new source of truth

One parent task can have one depth-1 child board. That is the whole trick.

## Parallel Agents

GoalBuddy 0.3.5 is parallel-agent-ready, but deliberately not an automatic scheduler.

That distinction matters.

GoalBuddy now helps you prepare safe parallel work surfaces:

- Scouts are read-only and safe to run in parallel by default.
- Judges are read-only and safe on separate board decisions.
- Workers are only safe when they are on separate boards or have provably disjoint `allowed_files`.
- Ambiguous Worker write scopes fail closed.

Use the new planner:

```bash
goalbuddy parallel-plan docs/goals/<slug>
```

It reports active tasks across the parent board and linked child boards:

- board path
- task id
- role
- recommended agent
- reasoning hint
- whether it is safe to parallelize
- why
- the exact prompt-render command

It does not mutate state. It does not spawn agents. It does not pretend overlap is safe.

That keeps GoalBuddy in the sweet spot: it makes parallel execution easier to see and safer to hand off, while native Codex or Claude Code agent flows still do the actual dispatch.

## Dark Mode

The local board now has real dark mode.

Not "the background changed and half the text disappeared" dark mode. The board, task cards, modals, settings, detail sections, receipt text, and embedded child boards all get readable dark styling.

The board also adds global viewer settings:

- Theme: system, light, dark
- Density: comfortable, compact
- Completed column: show, collapse
- Open boards: last viewed, newest
- Motion: system, reduce, allow

Settings are local viewer preferences and live at:

```text
~/.goalbuddy/local-board-settings.json
```

Tests can override that path with:

```bash
GOALBUDDY_LOCAL_BOARD_SETTINGS_PATH=/tmp/goalbuddy-settings.json
```

## The Local Board Got Sharper

The board header now matches the GoalBuddy site style more closely:

- GoalBuddy mark and wordmark
- green live blip beside the wordmark
- board selector only when multiple boards are running
- GitHub stars link that opens in a new window
- cleaner settings gear

Multiple boards now share one readable local hub:

```text
http://goalbuddy.localhost:41737/
```

Each board gets its own path:

```text
http://goalbuddy.localhost:41737/subgoal-parent-board/
http://goalbuddy.localhost:41737/local-kanban-board-extension/
```

Launch another board while the hub is already running and GoalBuddy registers it with the existing local server instead of replacing the first board.

If port `41737` is occupied by something that is not GoalBuddy, the CLI says so clearly.

## Active Work Is Easier To See

Active cards now have a visible in-progress treatment: a subtle moving border that makes the current task obvious at a glance.

The motion respects:

- `prefers-reduced-motion`
- the board Motion setting

So the board can feel alive without becoming noisy.

## Better Agent Contracts

Scout, Judge, and Worker now have sharper contracts.

Scout:

- read-only
- compact evidence
- no edits
- no task selection
- receipt-shaped output

Judge:

- read-only
- phase gates and risky decisions only
- completion skepticism
- parallel-safety decisions
- subgoal approval boundaries

Worker:

- edits only `allowed_files`
- runs listed verification
- stops when scope expands
- returns changed files and verification results
- treats parallel Worker safety conservatively

This is the durable GoalBuddy model:

```text
Scout maps. Judge gates. Worker patches. Receipts prove. state.yaml decides.
```

## Deterministic Prompt Rendering

New command:

```bash
goalbuddy prompt docs/goals/<slug>
goalbuddy prompt docs/goals/<slug> --task T004
goalbuddy prompt --board docs/goals/<slug>/state.yaml --task T004
```

The renderer emits compact task-specific prompts with:

- board path
- task id
- task type
- objective
- inputs
- constraints
- allowed files
- verify commands
- stop conditions
- reasoning hint
- recommended agent
- expected receipt shape

It avoids the bad handoff pattern where a subagent gets the entire state file, chat history assumptions, and too much inherited context.

## Checker And Durability

The checker now understands 0.3.5 branching.

It accepts:

- depth-1 subgoals under the parent goal root
- child boards with `goal.md`, `state.yaml`, and `notes/`
- parent tasks linked to valid child boards
- Worker changed files that match simple `allowed_files` globs

It rejects:

- child paths outside the parent root
- child paths that do not point to `state.yaml`
- missing child state files
- nested child subgoals
- invalid child board state
- done Workers with changed files outside scope
- final completion without the expected verification and audit evidence

The board renderer also fails closed on invalid child paths, so a malformed subgoal cannot make the local board read a `state.yaml` outside the parent goal root.

## Demo

Run the bundled parent/child board:

```bash
node goalbuddy/extend/local-goal-board/scripts/local-goal-board.mjs \
  --goal goalbuddy/extend/local-goal-board/examples/subgoal-parent
```

Then try:

- switch to dark mode from the gear menu
- open task `T004` to see the embedded child board
- launch another board and use the header selector
- run `goalbuddy parallel-plan goalbuddy/extend/local-goal-board/examples/subgoal-parent`
- run `goalbuddy prompt goalbuddy/extend/local-goal-board/examples/subgoal-parent`

## Tests

0.3.5 adds or expands coverage for:

- parent task subgoal payloads
- embedded child boards
- missing child state files
- outside-root child paths
- live child-state updates over SSE
- multi-board hub registration
- settings persistence and normalization
- dark-mode readability surfaces
- prompt rendering
- read-only parallel planning
- overlapping Worker write scopes
- overlapping Worker glob patterns
- checker rejection for outside-root, missing, and nested subgoals
- plugin/source mirror consistency

Verified locally with:

```bash
npm run check
git diff --check
npm run publish:check
```

## Release Boundaries

This release intentionally does not add:

- automatic parallel-agent spawning
- a parallel Worker scheduler
- automatic receipt application
- UI controls for creating or editing subgoals
- recursive/nested subgoals
- cloud-hosted board state

The principle is Karpathy-level simple:

```text
One board owns one state file. A subgoal is one child state file. Parallel work is allowed only when the write boundaries are clear.
```

That gives GoalBuddy a stronger execution loop without making it heavy.

## Package Notes

This release updates:

- npm package version: `0.3.5`
- Codex plugin version: `0.3.5`
- Claude Code plugin version: `0.3.5`
- mirrored GoalBuddy skill files under `plugins/goalbuddy/skills/goalbuddy/`
