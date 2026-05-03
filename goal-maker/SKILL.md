---
name: goal-maker
description: Use for large, stalled, or unhealthy Codex /goal runs that need a finite-state PM loop, verification gate, recovery mode, bounded worker packets, subagent delegation, or completion audit.
---

# Goal Maker

A `/goal` is a state machine, not a project plan.

Goal Maker turns a vague long-running objective into this loop:

```text
observe -> gate -> choose one unit -> act or delegate -> verify -> record -> repeat
```

Progress is one verified state transition.

## When To Use

Use this skill for goals that are multi-hour, multi-slice, ambiguous, high-risk, already stale, already red, or likely to need worker delegation. For a one-change task, do not create a heavy control system.

## The Five Primitives

1. **State**: one file says what is true.
2. **Gate**: decides whether feature work is allowed.
3. **Unit**: the only work that may happen.
4. **Evidence**: proves the state transition.
5. **Agents**: optional tools, never owners.

## Control Files

For a big or recovery goal, create:

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

Optional only when needed:

```text
  review-bundles.md
  decisions.md
  blockers.md
```

The goal root is the control plane. It may contain only:

- `README.md`
- `state.yaml`
- `evidence.jsonl`
- `review-bundles.md`
- `decisions.md`
- `blockers.md`
- directories

Do not write Scout reports, Judge reviews, audits, packets, staging slices, verification notes, or completion tables at the goal root. Put generated narrative artifacts under `artifacts/<kind>/` and reference their paths from `state.yaml`, unit files, or `evidence.jsonl`.

Use these default artifact destinations:

| Artifact | Destination |
|---|---|
| `scout-*.md` | `artifacts/scouts/` |
| `judge-*.md` | `artifacts/judges/` |
| `*-audit*.md` | `artifacts/audits/` |
| `*owner*packet.md`, `*handoff*.md` | `artifacts/owner-packets/` |
| `staging-slice-*.md`, `*staging*proposal.md` | `artifacts/staging-slices/` |
| `*commit-slicing*.md`, `*commit-slice*.md` | `artifacts/commit-slices/` |
| `*verification*.md` | `artifacts/verification/` |
| `*completion*.md`, `*gap-table*.md` | `artifacts/completion/` |

Every generated artifact must start with a compact frontmatter block:

```yaml
---
unit: U-001
kind: scout | judge | audit | owner-packet | staging-slice | commit-slice | verification | completion | archive
status: current | superseded | blocked
created_at: "<iso timestamp>"
supersedes: []
source_evidence: []
---
```

`state.yaml` is truth. Narrative plans, matrices, and status docs are comments unless they match `state.yaml` and current verification.

Use `templates/state.yaml`, `templates/unit.md`, and `templates/artifact.md`.

## Mandatory First Action

For a big or recovery goal, do not edit implementation files until control state exists or is repaired.

The first action must be one of:

- create `docs/goals/<slug>/state.yaml` and the first unit;
- repair stale control state;
- checkpoint an unhealthy worktree;
- escalate to Judge because no safe unit can be defined.

## Gate

Before every continuation, update the gate.

- `green`: one bounded unit may proceed.
- `red`: required verification failed; recovery only.
- `blocked`: something is blocked.

Blocked has scope. A blocked gate does not stop the goal unless `blocked_scope` includes `all_local_work`.

Common scopes:

- `completion`
- `live_proof`
- `production_readiness`
- `feature_work`
- `current_unit`
- `all_local_work`

Feature work is allowed only when:

- exactly one active unit exists;
- required verification is current for the dirty tree;
- dirty diff is inside the active unit scope or explicitly partitioned;
- behavior changes have source, spec, or decision evidence;
- commands and stop conditions are defined;
- no strategic blocker invalidates the unit.

Red verification means:

```text
no feature work
no unrelated cleanup
no parity claims
no completion claims
```

Allowed red work:

- reproduce or classify the failure;
- repair the owning unit;
- update stale state;
- classify artifacts;
- partition broad diff;
- escalate ambiguity.

After two failed repair attempts on the same unit, stop patching that unit and add `current_unit` to `blocked_scope`. Do not add `all_local_work` unless no local productive lane remains.

## Blocked Does Not Mean Stop

External blockers usually block completion, live proof, production readiness, or a specific unit. They do not automatically block the goal.

If `gate.status: blocked` but `blocked_scope` does not include `all_local_work`, the PM must continue with local productive work that improves truth, reviewability, handoff quality, unblock readiness, or mechanical safety.

Allowed local work lanes include:

- review-bundle partitioning and staging plan;
- artifact classification and ignore/delete/keep recommendations;
- verification freshness under the declared repo engine;
- completion-audit evidence gap table;
- source-ledger and matrix consistency audit;
- failing/stale test classification;
- guard/script improvements that prevent drift;
- API/live blocker decision memo with exact options and owner inputs;
- packaging/staging proposal, clearly marked as a proposal;
- PR/commit slicing plan with files, evidence, verification, and blockers per bundle.

The PM may add `all_local_work` to `blocked_scope` only after producing an exhaustion table proving every local work lane is exhausted, unsafe, or requires external input.

## Checkpoint Does Not Mean Stop

After a unit completes, checkpoint the evidence and immediately select the next active unit unless `blocked_scope` includes `all_local_work` or the completion audit passed.

Do not end a continuation with `active_unit` pointing at a completed unit while local productive work remains. Before ending, the PM must either:

- set the next active unit and `gate.next_action`, or
- add `all_local_work` to `blocked_scope` with an exhaustion table.

Run the guard script when available:

```bash
node <skill-path>/scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml
```

For an older goal with root-level artifact sprawl, classify the files before continuing:

```bash
node <skill-path>/scripts/organize-goal-artifacts.mjs docs/goals/<slug>/state.yaml
node <skill-path>/scripts/organize-goal-artifacts.mjs docs/goals/<slug>/state.yaml --write
```

If the script and your judgment disagree, choose the more conservative state.

## Unit

A unit is the smallest reviewable state transition.

A unit must have:

- objective;
- evidence;
- allowed files or exact subsystem boundary;
- non-goals;
- commands;
- stop conditions;
- done criteria.

No unit, no implementation.

The PM loop asks:

```text
What is the smallest reviewable state transition that makes the state more true?
```

Not:

```text
What can I implement next?
```

## Evidence

Behavioral, compatibility, migration, auth, money, safety, persistence, or destructive work is not reviewable unless it records:

```text
source/spec/decision
  -> implementation
  -> positive test
  -> negative or safety test when relevant
  -> verification result
  -> state update
```

Lots of docs or tests do not count unless this chain is coherent.

Append every completed, blocked, or escalated unit to `evidence.jsonl`.

Each evidence event should include any artifact paths produced or consumed by the unit. Artifact files are supporting evidence; they are not canonical state unless `state.yaml` or `evidence.jsonl` points to them.

## Agents

Agents are optional tools, not project owners.

Use only three default roles:

| Agent | Thinking level | Write access | Use for |
|---|---:|---:|---|
| Scout | medium | no | read-only source/spec mapping |
| Worker | low | yes, bounded | one exact implementation or recovery unit |
| Judge | high | no | strategic review, ambiguity, scope, completion |

Only the main `/goal` PM may choose the active unit, update the gate, mark units done, or mark the goal complete.

At most one write-capable Worker may be active unless `state.yaml` proves disjoint write scopes.

Custom agent examples live in `assets/codex-agents/`. Copy them into `.codex/agents/` only when you want Codex to spawn these roles.

## Worker Orders

A Worker order must include:

- one objective;
- current gate state;
- source/spec/decision evidence;
- allowed files;
- non-goals;
- commands;
- stop conditions;
- required return format.

A Worker must stop when evidence is missing, files outside scope are needed, verification fails twice, product/API strategy is required, or the diff exceeds the order.

Use `templates/worker-order.md`.

## Escalate To Judge

Use Judge for high-thinking review when:

- source, tests, and product behavior conflict;
- verification and state disagree;
- dirty diff exceeds active scope;
- API, live, deployment, or compatibility strategy blocks acceptance;
- a worker needs broad files or giant-file refactor;
- safety, auth, money, persistence, idempotency, replay, or destructive behavior is ambiguous;
- completion or parity is being considered.

Judge should decide and constrain. Judge should not broadly implement.

## Completion

Never complete because work looks substantial.

Complete only after an audit maps every success criterion:

```text
criterion -> evidence -> command result -> current state row
```

If anything is stale, red, blocked, externally gated, or unreviewable, the goal is not complete.

Use `templates/completion-audit.md`.

## Default `/goal` Shape

```text
/goal Operate docs/goals/<slug>/state.yaml as a state machine. On every continuation: observe, update the gate, execute at most one active unit, verify, append evidence, update state, and route around blockers by scope. Stop only when blocked_scope includes all_local_work with an exhaustion table, or when final audit passes.
```
