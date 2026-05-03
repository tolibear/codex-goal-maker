# goal-maker

A finite-state PM loop for Codex `/goal` efforts: install the skill, install the agent roles, and keep long-running work honest with gates, units, and evidence.

```bash
npx goal-maker
```

Then invoke the skill inside Codex:

```text
$goal-maker
```

`goal-maker` installs a Codex skill plus three agent roles:

- **Scout** maps source/spec evidence before work starts.
- **Worker** executes one bounded implementation or recovery order, limited to the files and stop conditions the PM gives it.
- **Judge** reviews ambiguity, risky scope, blockers, and completion claims.

The main Codex thread remains the PM. Agents help gather evidence, patch bounded work, and challenge completion, but they do not own goal state.

![A hand-drawn loop showing Observe, Gate, Unit, and Verify.](assets/goal-loop.png)

## Why

Long Codex goals tend to drift: assumptions get treated as truth, stale verification looks green, and broad work becomes hard to review. `goal-maker` turns a goal into a state machine:

```text
observe -> gate -> choose one unit -> act or delegate -> verify -> record -> repeat
```

```text
State is truth.
Gate decides permission.
Unit is the only work.
Evidence proves progress.
Agents are tools.
```

## What It Provides

- An `npx` installer package named `goal-maker`
- A self-contained Codex skill in `goal-maker/`
- Bundled Scout, Worker, and Judge agent definitions in `goal-maker/agents/`
- Goal control templates in `goal-maker/templates/`
- A state checker script: `goal-maker/scripts/check-goal-state.mjs`
- An artifact organizer for older flat goal folders: `goal-maker/scripts/organize-goal-artifacts.mjs`

## Commands

Install or update the skill and bundled agents:

```bash
npx goal-maker
npx goal-maker update
```

Repair only the agent definitions:

```bash
npx goal-maker agents
```

Check what is installed:

```bash
npx goal-maker doctor
```

Use a non-default Codex home:

```bash
npx goal-maker install --codex-home /path/to/.codex
```

## How It Works

The root control file is `state.yaml`. Narrative plans, matrices, audits, and reports are supporting evidence unless they match the current state and verification.

![A hand-drawn state.yaml file feeding a gate and the next unit.](assets/state-gate.png)

Create one folder per goal:

```text
docs/goals/<slug>/
  README.md
  state.yaml
  evidence.jsonl
  units/
    active/
    completed/
    blocked/
  artifacts/
    scouts/
    judges/
    audits/
    owner-packets/
    staging-slices/
    commit-slices/
    verification/
    completion/
    archive/
```

![A hand-drawn folder tree showing units, artifacts, and evidence.jsonl.](assets/artifacts-tree.png)

Keep the goal root as the control plane. Root files are limited to `README.md`, `state.yaml`, `evidence.jsonl`, `review-bundles.md`, `decisions.md`, `blockers.md`, and directories.

Generated Scout reports, Judge reviews, audits, owner packets, staging slices, verification notes, and completion tables belong under `artifacts/<kind>/` and should be referenced from `state.yaml`, unit files, or `evidence.jsonl`.

## Use

Start `/goal` with an objective that points to the state machine:

```text
/goal Operate docs/goals/<slug>/state.yaml as an autonomous PM loop. On every continuation: observe current state, update the gate, execute or delegate at most one active unit, verify, append evidence, update state, and stop, route, recover, or escalate when the gate is red or blocked. Complete only after the final audit passes.
```

Check state:

```bash
node ~/.codex/skills/goal-maker/scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml
```

Classify old flat artifact files:

```bash
node ~/.codex/skills/goal-maker/scripts/organize-goal-artifacts.mjs docs/goals/<slug>/state.yaml
node ~/.codex/skills/goal-maker/scripts/organize-goal-artifacts.mjs docs/goals/<slug>/state.yaml --write
```

## Repository Layout

```text
.
  README.md
  CONTRIBUTING.md
  assets/
  bin/
  package.json
  goal-maker/
    SKILL.md
    agents/
    scripts/
    templates/
```

`goal-maker/` is the installable skill. Everything outside it is repo-level documentation and README artwork.

## Core Rule

The human operator should not manage routine task breakdown. Human blockers are recorded and routed around when independent safe work remains. The goal should stop for the human only when every safe next action is blocked, credentials/access/destructive operations are required, or proceeding would be unsafe or wasteful.

Blocked has scope. If live proof, deployment, production inventory, or packaging signoff is blocked, set `gate.status: blocked` with `blocked_scope: [completion, live_proof, production_readiness]` and keep doing local work that improves truth, reviewability, handoff quality, unblock readiness, or mechanical safety.

The goal stops only when `blocked_scope` includes `all_local_work`, and that requires an exhaustion table.

## Status

Early open-source project. Do not treat this as a replacement for repo-specific `AGENTS.md`, tests, or mechanical CI checks. Use it to structure the control loop; let repo scripts enforce repo facts.
