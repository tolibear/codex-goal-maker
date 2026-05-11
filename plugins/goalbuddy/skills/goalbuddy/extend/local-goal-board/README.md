# Local Goal Board

Generate a small local GoalBuddy board for a goal directory and watch it update live while agents work.

The extension keeps `state.yaml` authoritative. It writes static web app files into the goal directory and serves them from a local-only Node server. The browser subscribes to Server-Sent Events, so cards update as `state.yaml` or `notes/` changes without a manual reload.

## Use When

- A human wants a local board view during a GoalBuddy run.
- The team wants GitHub-Projects-like visibility without GitHub credentials.
- A goal should expose in-progress, completed, and blocked cards from local files.

## Generate And Serve

```bash
node extend/local-goal-board/scripts/local-goal-board.mjs \
  --goal docs/goals/<slug>
```

The generated app includes the bundled `assets/goalbuddy-mark.png`, so the board keeps the GoalBuddy mark after the extension is installed or copied elsewhere.

The command writes:

```text
docs/goals/<slug>/.goalbuddy-board/
  index.html
  styles.css
  app.js
```

Then it starts a server on `127.0.0.1` and prints the local URL.

## Check Without A Long-Running Server

```bash
node extend/local-goal-board/scripts/local-goal-board.mjs \
  --goal docs/goals/<slug> \
  --once \
  --json
```

## Live Updates

The server watches:

- `docs/goals/<slug>/state.yaml`
- `docs/goals/<slug>/notes/`

When either changes, the server re-reads the goal board and pushes a fresh board payload to connected browsers over `/events`.

## Board Mapping

- `queued` tasks appear under **Todo**.
- `active` tasks appear under **In Progress**.
- `blocked` tasks appear under **Blocked**.
- `done` tasks appear under **Completed**, the right-most column.

Clicking a card opens a detail modal with the task objective, status, assignee, inputs, constraints, expected output, verify commands, allowed files, stop conditions, and receipt details. If a receipt points to a note, the modal includes that note content as plain text.

## Verification

```bash
node --test extend/local-goal-board/test/*.test.mjs
node extend/local-goal-board/scripts/local-goal-board.mjs \
  --goal extend/local-goal-board/examples/sample-goal \
  --once \
  --json
```

## Boundaries

- `state.yaml` remains the source of truth.
- The server binds to `127.0.0.1` by default.
- The generated UI renders file content as text, not raw HTML.
- No package dependencies are required.
