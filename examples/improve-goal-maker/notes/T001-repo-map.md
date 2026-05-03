# T001: Goal Maker Repo Map

Task: `T001`
Kind: `scout`
Status: `current`

## Summary

Goal Maker is a small dependency-free npm package that installs a Codex skill, three agent role definitions, templates, and a v2 board checker. The core verification path is healthy: syntax checks and all current checker tests pass, a temporary install plus doctor run succeeds, and the package dry run includes the expected runtime files. The highest-leverage next investigation is not packaging correctness; it is workflow reliability around checker blind spots, agent-installation assumptions, and template/skill contract drift.

## Repo Map

- `README.md` describes the package purpose, install commands, board model, repository layout, and status caveats.
- `CONTRIBUTING.md` defines the local verification contract: `npm run check`, temporary install/doctor, and `npm pack --dry-run`.
- `package.json` exposes the `goal-maker` bin, keeps runtime dependency-free, packages the skill runtime plus docs/assets, and defines `check`, `test`, and `pack:dry-run`.
- `goal-maker/SKILL.md` is the installed skill contract: direct `$goal-maker` creates or repairs a v2 board, stops for user choice, and `/goal` owns the PM loop.
- `goal-maker/bin/goal-maker.mjs` installs the skill and bundled `goal_*.toml` agents into a Codex home and supports `install`, `update`, `agents`, `doctor`, and help.
- `goal-maker/scripts/check-goal-state.mjs` validates v2 board shape with a lightweight line-oriented parser.
- `goal-maker/scripts/install-agents.mjs` is a secondary agent copy helper.
- `goal-maker/templates/goal.md`, `state.yaml`, and `note.md` seed new goal control files.
- `goal-maker/agents/goal_scout.toml`, `goal_worker.toml`, and `goal_judge.toml` define the intended role constraints.
- `goal-maker/test/check-goal-state.test.mjs` covers key checker invariants.

## Verification Commands

- `npm run check` passed: Node syntax checks and 7 node:test cases passed.
- Temporary install plus doctor passed: `skill_installed: true`; installed agents were `goal_judge.toml`, `goal_scout.toml`, and `goal_worker.toml`.
- `npm pack --dry-run` passed and listed the expected package files, including `README.md`, `CONTRIBUTING.md`, `assets/`, `package.json`, and `goal-maker/` runtime files.
- `node goal-maker/scripts/check-goal-state.mjs examples/improve-goal-maker/state.yaml` passed with `ok: true`.

## Health Signals

- Current tests cover a valid Scout board, active Worker requirements, legacy v1 rejection, one-active-task enforcement, done-task receipt requirements, unexpected root entries, and final audit completion.
- The checker intentionally avoids dependencies, but it parses YAML with regular expressions and line indentation. This is acceptable for the template subset but creates likely blind spots for richer valid YAML or misleading strings inside quoted values.
- The package has two agent-installation paths: the CLI in `goal-maker/bin/goal-maker.mjs` and the helper in `goal-maker/scripts/install-agents.mjs`. They are similar but not identical.
- The direct skill contract says `$goal-maker` must verify Scout, Worker, and Judge agents are installed or explain what is missing; current templates mark them `installed`, while actual verification is behavior implemented by the PM thread, not the CLI/checker.

## Ranked Improvement Candidates

1. Add checker tests and fixes for root-path robustness and YAML parsing edge cases, especially misleading legacy markers inside quoted values or comments.
2. Reconcile or document the two agent-installation paths so CLI behavior, helper behavior, and README guidance cannot drift.
3. Make agent installation status less assumption-driven in generated boards or add checker warnings when agent status values are placeholders.
4. Add tests for the CLI install/doctor/package path so the contributor verification contract is covered by `npm run check`, not just manual commands.
5. Tighten docs/templates around what `/goal` PM may do in Codex environments where actual subagent dispatch is unavailable and roles are simulated in-thread.

## Candidate Next Tasks

- Investigate checker blind spots with focused failing test candidates before choosing a fix.
- Compare `goal-maker/bin/goal-maker.mjs` and `goal-maker/scripts/install-agents.mjs` and decide whether to consolidate, test, or document the helper.
- Judge the first implementation tranche after the risk map, preferring a small test-backed checker or CLI reliability fix.

## Board Receipt Snippet

```yaml
receipt:
  result: done
  note: notes/T001-repo-map.md
  summary: "Repo map completed; verification is green, install/package checks work, and the top improvement area is Goal Maker workflow reliability around checker blind spots, agent installation assumptions, and template/skill drift."
```
