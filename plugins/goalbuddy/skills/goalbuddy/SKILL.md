---
name: goalbuddy
description: Compatibility alias for GoalBuddy. Use goal-prep as the canonical direct board compiler, or deep-intake when the user wants deeper sparring, grounding reads, anti-misfire fences, and quality-gated GoalBuddy artifacts before starting /goal.
---

# GoalBuddy Compatibility Alias

`$goalbuddy` (Codex) or `/goalbuddy` (Claude Code) is a compatibility alias.

Use `$goal-prep` / `/goal-prep` for the direct GoalBuddy board compiler. Use
`$deep-intake` / `/deep-intake` when the user wants a deeper alignment pass
before the board is written.

When this alias is invoked:

1. Tell the user that `goalbuddy` is a legacy alias and `goal-prep` is the canonical entry point.
2. If the user wants a direct board, follow the same prepare-only workflow as `goal-prep`: create or repair `docs/goals/<slug>/goal.md`, `docs/goals/<slug>/state.yaml`, and `notes/`, then print `/goal Follow docs/goals/<slug>/goal.md.`.
3. If the user wants deeper sparring, recommend `deep-intake` and continue with the Deep Intake workflow only when the user clearly asks for it.

This alias is prepare-only. Do not execute the user's requested implementation work, inspect broad implementation surfaces, load unrelated skills, generate assets, or start `/goal` automatically.
