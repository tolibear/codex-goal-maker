---
description: Prepare a GoalBuddy board for a broad, long-running, or ambiguous goal. Compiles intake, writes goal.md/state.yaml, and prints the /goal command to run next. Does not start /goal automatically.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

Invoke the GoalBuddy `goal-prep` skill to prepare a board for the user's goal.

Follow the canonical GoalBuddy invocation boundary: prepare intake, create or repair `docs/goals/<slug>/goal.md`, `state.yaml`, and `notes/`, optionally open a visual board, then print exactly `/goal Follow docs/goals/<slug>/goal.md.` and stop.

Do not perform the requested work during this turn, even if it looks read-only or obviously useful. Put implementation, research, asset generation, and named-skill loading into Scout, Judge, or Worker tasks for the later `/goal` run.

User goal: $ARGUMENTS
