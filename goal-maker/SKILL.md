---
name: goal-maker
description: Compatibility alias for GoalBuddy during the rebrand migration window. Use $goalbuddy as the canonical skill.
---

# GoalBuddy Compatibility Alias

`$goal-maker` is the previous name for `$goalbuddy`.

Use `$goalbuddy` for new work. This compatibility skill exists so older prompts and local installs do not fail during the 60-90 day migration window.

When invoked through `$goal-maker`:

1. Tell the user Goal Maker has been rebranded to GoalBuddy.
2. Show the canonical command: `$goalbuddy`.
3. If the user wants to continue immediately, follow the same workflow as `$goalbuddy`: run diagnostic intake, create or repair `docs/goals/<slug>/goal.md` and `state.yaml`, preserve one active task, and print `/goal Follow docs/goals/<slug>/goal.md.` without starting `/goal` automatically.

Do not remove support for existing Goal Maker boards. GoalBuddy remains compatible with v2 `state.yaml` boards, existing `goal_*` agent role files, and installed extensions.
