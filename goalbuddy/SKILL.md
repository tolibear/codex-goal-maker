---
name: goalbuddy
description: Compatibility alias for GoalBuddy. Use goal-prep as the canonical direct board compiler.
---

# GoalBuddy Compatibility Alias

`$goalbuddy` (Codex) or `/goalbuddy` (Claude Code) is a compatibility alias.

Use `$goal-prep` / `/goal-prep` for the canonical GoalBuddy board compiler.

When this alias is invoked:

1. Tell the user that `goalbuddy` is a legacy alias and `goal-prep` is the canonical entry point.
2. Follow the same prepare-only workflow as `goal-prep`: create or repair `docs/goals/<slug>/goal.md`, `docs/goals/<slug>/state.yaml`, and `notes/`, then print `/goal Follow docs/goals/<slug>/goal.md.`.

This alias is prepare-only. Do not execute the user's requested implementation work, inspect broad implementation surfaces, load unrelated skills, generate assets, or start `/goal` automatically.
