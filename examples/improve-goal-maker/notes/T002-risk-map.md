# T002: Workflow Risk Map

Task: `T002`
Kind: `scout`
Status: `current`

## Summary

The highest-confidence risks are small and testable. First, `goal-maker doctor` reports success when one of the required bundled agents is missing, which weakens the "verify Scout, Worker, and Judge agents" contract. Second, the board checker accepts mismatched task `type` and `assignee` values, even though Goal Maker semantics depend on those fields agreeing. A lower-priority drift risk is that `update` does not overwrite stale existing agent definitions unless `--force` is supplied, despite README wording that says install or update the skill and bundled agents.

## Evidence

- `goal-maker/bin/goal-maker.mjs` `doctor()` exits based only on whether `skills/goal-maker/SKILL.md` exists. In a temp Codex home with `goal_worker.toml` removed, `doctor` exited 0 and reported only `goal_judge.toml` and `goal_scout.toml`.
- `goal-maker/scripts/check-goal-state.mjs` independently validates `task.type` and `task.assignee`, but does not validate pairs. A temp board with `type: scout` and `assignee: Worker` passed with `ok: true`.
- `goal-maker/scripts/check-goal-state.mjs` does not require or validate the `agents:` section. A temp board with the section omitted passed with `ok: true`.
- `goal-maker/bin/goal-maker.mjs` `installAgents()` skips existing `goal_*.toml` files unless `--force` is present. In a temp Codex home with a stale `goal_scout.toml`, `goal-maker update` left the stale file unchanged.
- `goal-maker/scripts/install-agents.mjs` copies any `.toml` except names containing `config-snippet`, while the CLI copies only `goal_*.toml`. Current files make this harmless, but it is a drift point.

## Small Safe Implementation Candidates

1. Add CLI tests for `doctor` and make `doctor` fail when any required agent file is missing. Allowed files would likely be `goal-maker/bin/goal-maker.mjs` and a new focused CLI test file.
2. Add checker tests for task type/assignee mismatch and fix the checker to reject mismatches. Allowed files would be `goal-maker/scripts/check-goal-state.mjs` and `goal-maker/test/check-goal-state.test.mjs`.
3. Add checker tests for missing or invalid `agents:` statuses and reject or warn. This is slightly more policy-heavy because templates currently treat agent status as PM-populated board metadata.
4. Decide whether `update` should overwrite existing bundled agents or whether README/CLI wording should clarify that `--force` is required for agent refresh.

## Recommended First Tranche

Prefer the `doctor` missing-agent fix. It directly supports the `$goal-maker` requirement to verify Scout, Worker, and Judge availability, has tight behavior, and can be verified with a new CLI test plus existing checks. The checker mismatch fix is also small, but it is less directly connected to the user-visible setup flow.

## Board Receipt Snippet

```yaml
receipt:
  result: done
  note: notes/T002-risk-map.md
  summary: "Risk map completed; doctor exits green with missing agents, checker accepts type/assignee mismatches, and update leaves stale agents unless forced."
```
