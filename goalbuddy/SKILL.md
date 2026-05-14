---
name: goal-prep
description: Goal Prep for GoalBuddy. Use for broad, long-running, stalled, vague, detailed, planned, or unhealthy Codex or Claude Code work that needs a structured /goal intake, autonomous task discovery, role-tagged Scout/Judge/Worker delegation, one active task, durable receipts, and a PM-owned rolling board that maximizes the chance of a successful goal run.
---

# Goal Prep

`$goal-prep` (Codex) or `/goal-prep` (Claude Code) prepares a GoalBuddy board. It does not start `/goal` automatically, but the board and starter `/goal` command must be shaped so the next run continues into safe execution by default.

GoalBuddy is for autonomous, long-running Codex or Claude Code work where the PM thread may need to discover the work, define tasks, sequence them, delegate them, execute them, verify them, and keep going without the human decomposing every step.

The loop is:

```text
raw user intent -> intake compiler -> discovery/plan validation/execution board -> one active task -> receipt -> board update -> repeat
```

## Invocation Boundary

There are two different modes:

- `$goal-prep`: prepare intake, `goal.md`, `state.yaml`, and the starter `/goal` command, then stop.
- `/goal Follow docs/goals/<slug>/goal.md.`: execute the board, including Scout/Judge/Worker work.

This boundary is strict. `$goal-prep` is not a lightweight `/goal`; it is a board compiler.

During a `$goal-prep` turn, do not perform the user's requested work, even if the work looks read-only, preparatory, or obviously useful. Do not refresh or load named skills, inspect implementation files, browse reference repos, research design inspiration, generate design plans, generate images/assets, run app-specific checks, or edit product files. Put those actions into Scout, Judge, Worker, or PM tasks for the later `/goal` run.

Allowed `$goal-prep` actions:

- run the bundled GoalBuddy update checker and mention a newer version if one is available;
- ask diagnostic intake questions and wait when required;
- create or repair only `docs/goals/<slug>/goal.md`, `docs/goals/<slug>/state.yaml`, `docs/goals/<slug>/notes/`, and the generated `.goalbuddy-board/` visual board artifact;
- create and open the selected visual board surface for the goal;
- optionally run the GoalBuddy board checker against that `state.yaml`;
- verify GoalBuddy agent availability, if this can be done without touching implementation work, and record `installed`, `bundled_not_installed`, `missing`, or `unknown` truthfully;
- print exactly `/goal Follow docs/goals/<slug>/goal.md.`;
- ask whether to start `/goal`, refine the board, or stop.

If the prompt names another skill or tool, such as "use the taste skill", "refresh the taste skill", "look at this repo", "use browser", or "generate assets", record that requirement in the charter and seed tasks. Do not load that skill, browse that repo, or generate those assets during `$goal-prep`.

## Update Check

At the start of a `$goal-prep` turn, check whether GoalBuddy itself is stale. Run the bundled checker from the installed skill directory when available:

```bash
node <skill-path>/scripts/check-update.mjs --json
```

If the checker reports `update_available: true`, tell the user once before continuing:

```text
GoalBuddy <latest_version> is available. After this turn, update with: npx goalbuddy
```

Do not block intake or board creation on update checking. If the checker is missing, cannot find npm, or network access fails, continue silently unless the user asked about updates.

## Intake Compiler

Before creating, repairing, or running a board, privately translate the user's input into a Goal Intake. The input may be vague, specific, or detailed with an existing plan. Do not dump the intake to the user unless they ask for it.

Extract:

- original request: the shortest faithful user wording;
- interpreted outcome: what must become true;
- input shape: `vague | specific | existing_plan | recovery | audit`;
- audience or beneficiary;
- non-goals and hard constraints;
- authority: `requested | approved | inferred | needs_approval | blocked`;
- proof type: `test | demo | artifact | metric | review | source_backed_answer | decision`;
- completion proof: the observable signal for full outcome completion;
- likely misfire: how `/goal` could succeed at the wrong thing;
- blind spots: important risks, choices, or success dimensions the user may not have named yet;
- existing plan facts: user-provided steps, files, constraints, or sequencing that must be preserved but still validated.

Ask the visual-board question early, before detailed task shaping:

```text
Do you want to set up a visual board for this?
```

Recommended options:

1. Local live board (Recommended) - starts immediately, requires no credentials, and lets the user watch tasks populate inside Codex or Claude Code.
2. GitHub Projects - best when stakeholders need a shared external board and the user can approve GitHub credentials/project details.
3. No visual board - best for quick or private goals where the file board is enough.

If the user chooses the local live board, create the goal directory, `notes/`, and an initial minimal `state.yaml` as soon as the slug is known, then run `npx goalbuddy board docs/goals/<slug>` and open the printed local URL in the AI coding agent's in-app browser (the Codex in-app Browser, the Claude Code preview, or the user's regular browser). The default local hub is `http://goalbuddy.localhost:41737/`, and board URLs normally look like `http://goalbuddy.localhost:41737/<slug>/`. In short: start the local board before filling the task list so the board pops up right away and cards populate live as `state.yaml` changes. Include the printed board URL in the final prep response as an actual clickable Markdown link, for example `[Open GoalBuddy board](http://goalbuddy.localhost:41737/<slug>/)`. Do not put the board URL only in a code block, quote, HTML comment, or prose that the UI cannot click.

If the user chooses GitHub Projects, ask for approval and the required project target before any live write. Create or sync the GitHub Project at the same early point as the local board: after the goal root and skeleton `state.yaml` exist, before the detailed task list is finished, then sync again as tasks populate. Run a dry-run sync first when possible. Missing GitHub credentials or project details should not block local board creation or goal prep; record the missing requirement in `visual_board.github_projects` and seed a PM setup task.

Ask before board creation when the request is vague, strategic, improvement-oriented, or open-ended and the user has not explicitly said to use defaults. Ask one guided question at a time with 2-3 options and a recommended default, then wait. Continue the diagnostic intake until the user's answers are sufficient to choose the board shape. Do not create or repair `docs/goals/<slug>/` until the diagnostic intake is complete or the user explicitly accepts defaults.

For vague or strategic goals, one answer is rarely enough. After each answer, reflect what it implies, name one likely blind spot, and ask the next material question. The goal is to help the user discover what they mean, not merely collect a form value.

Proceed with labeled assumptions and seed a safe board only when at least one is true:

- the user provides a specific outcome and enough completion proof to choose the first phase;
- the user provides an existing plan or concrete artifact to validate;
- the request is clearly recovery or audit with a target path, error, failing command, or stale board;
- the user says to proceed, use defaults, or prepare the board now.

If a missing answer materially changes outcome, authority, scope, risk, owner, completion proof, or board-handling choice, ask even if the user provided details.

Examples:

- Vague input: start with Scout, then Judge, bounded Worker, final audit.
- Specific input with incomplete evidence: start with Scout or Judge before Worker.
- Existing plan: preserve the plan as facts, start with PM or Judge plan validation, then queue bounded Worker slices from the validated plan.
- Recovery: start with Scout evidence mapping or Judge triage before writes.
- Audit: keep the board read-only unless the user approves follow-up execution.

The intake compiler is an internal strut for `/goal`: it exists to make the first board correct, not to create process theater.

## Guided Intake Surface

For interactive vague or improvement-oriented input, run a diagnostic intake. Show only the current turn of the diagnostic, not the private intake:

```markdown
I read this as: [one-sentence interpreted outcome].

One possible blind spot: [a risk, unstated choice, or success dimension the user may not have named].

[One material question?]

1. [Recommended direction] (Recommended) - [when it wins]
2. [Second direction] - [when it wins]
3. [Third direction, only if genuinely useful] - [when it wins]

My default would be [option] because [short reason].
```

Stop after each question. Do not create files, repair an existing board, run checks, or print `/goal` until the diagnostic intake is complete. Do not dump the private intake.

Minimum diagnostic ladder for vague, strategic, or improvement-oriented goals:

1. Visual board: ask "Do you want to set up a visual board for this?"
2. Intent target: what kind of improvement or outcome matters most?
3. Success proof: what evidence would convince the user this worked?
4. Scope and non-goals: what should remain untouched or explicitly out of scope?
5. Goal handling: reuse an existing goal, create a fresh goal, or inspect first?

Ask these one at a time. Skip a step only when the user's words already answer it clearly. After the user answers one step, do not assume the remaining steps; ask the next unresolved material question.

For "make GoalBuddy better", a good first question is which improvement target matters most: intake clarity, board/execution reliability, completion proof/eval coverage, or user experience during long-running goals. A good second question asks what proof would convince the user it improved. A good third question asks whether to reuse an existing goal, create a fresh goal, or inspect first.

## Direct `/goal` Entry

When `/goal` is invoked with raw user intent instead of an existing `docs/goals/<slug>/goal.md` path, run the Intake Compiler before doing implementation work. The PM should not treat raw `/goal` text as an execution plan until it has:

- classified the input shape;
- preserved any existing plan facts;
- identified the likely misfire and at least one blind spot;
- recorded authority and proof;
- answered or explicitly defaulted the diagnostic ladder for vague/strategic input;
- selected the safest first active task;
- either asked the required guided intake question or written `goal.md` and `state.yaml` from a sufficiently clear intake.

If the raw input is detailed and already contains a plan, the first board task should validate and operationalize that plan rather than rediscovering from scratch. If the raw input is vague, run the diagnostic intake before creating the board unless the user explicitly says to use defaults. If the raw input is blocked by authority, policy, destructive action, credentials, or ambiguous completion proof, ask one guided question with options or create the smallest safe read-only task only after the user chooses to proceed.

The target is not literal certainty. It is the highest practical likelihood of a successful goal run: preserve the user's intent, avoid the likely misfire, pick the earliest responsible phase, require proof, and keep advancing safe work until a final audit proves the full outcome.

## What `$goal-prep` Does

When invoked directly, run intake first. For vague, strategic, improvement-oriented, or open-ended input, run the diagnostic intake and stop before creating or repairing the board until enough material answers are known. For sufficiently clear, planned, recovery, audit, or explicitly-defaulted input, prepare or repair the board and stop for user choice.

Do:

- check for a newer GoalBuddy version once at the start and mention it without blocking;
- clarify or infer the goal title and slug;
- run the Intake Compiler;
- ask diagnostic intake questions when clarity would materially improve the board;
- classify the goal as `specific`, `open_ended`, `existing_plan`, `recovery`, or `audit`;
- create or repair `docs/goals/<slug>/`;
- create `goal.md`, `state.yaml`, and `notes/`;
- if requested, start the local visual board immediately and open it in the AI coding agent's in-app browser (Codex in-app Browser, Claude Code preview, or the user's regular browser) before filling the task list;
- seed a role-tagged task board that matches the input shape;
- make the first active task safe;
- verify Scout, Worker, and Judge agent availability or record an explicit truthful state;
- print the exact command `/goal Follow docs/goals/<slug>/goal.md.`;
- ask whether to start now, refine `goal.md`, or stop.

Do not:

- start `/goal` automatically;
- use, refresh, inspect, or load named skills requested by the goal; schedule that as `/goal` work instead;
- browse links, inspect reference repos, read implementation files, generate design plans, generate images, or create assets for the requested outcome;
- create or repair a board from vague/open-ended input before diagnostic intake is complete;
- create `evidence.jsonl`, `units/`, or `artifacts/` for new v2 goals;
- edit implementation files before the board exists;
- invent implementation tasks from vibes when the intake requires Scout, Judge, or plan validation first;
- discard a user-provided plan; preserve it as facts and validate it before execution;
- treat `goal.md` as board truth when it conflicts with `state.yaml`.

## `/goal` Default Bias: Users Want Work Done

This section applies after the user starts `/goal Follow docs/goals/<slug>/goal.md.` It does not apply to the initial `$goal-prep` board-preparation turn.

Unless the user explicitly asks for planning only, treat a `/goal` run as a request for work to happen.

Planning, Scout findings, Judge decisions, and a queued Worker task are not terminal outcomes when the user's original ask is for a working capability, automation, fix, cleanup, or backend/frontend behavior. They are setup for execution.

For execution goals, the default run is continuous:

```text
Discover enough evidence, choose the largest reversible local work package, implement it, verify it, review only at risk or phase boundaries, then immediately choose and execute the next work package until the full original outcome is complete.
```

If the first `/goal` run reaches a Judge decision that names a safe Worker task with `allowed_files`, `verify`, and `stop_if`, the PM should activate that Worker and continue in the same run unless a stop condition applies.

After a verified Worker package, do not mark the thread goal complete merely because that package passed. For broad automation or product goals, continue by reopening or advancing the board to the next safe Worker package until the full owner outcome is complete.

Missing owner input, credentials, production access, destructive-operation permission, or policy decisions are blockers for specific tasks, not stopping conditions for the whole goal. When a slice hits one of those blockers, mark that exact task blocked with a receipt, create a safe follow-up or workaround task, and keep doing local, non-destructive work that advances the full outcome.

## Slice Sizing Policy

A good task is the largest safe useful slice.

Small is not the goal. Useful is the goal.

Safe does not mean small. Safe means bounded, explicit, verified, and reversible.

A good Worker task usually produces a working screen, a working API path, a working data pipeline step, a working backend vertical slice, a real bug fix, or a milestone review. A bad Worker task is one more tiny helper, projection function, contract file, read-only proof, or doc note unless that tiny task is truly blocking progress.

Judge picks the largest safe useful next slice. Worker completes the whole assigned slice. Judge reviews the whole slice.

After two tiny tasks in a row, PM or Judge should reorient the board. If a demo milestone is complete, the next task should move toward the next real milestone.

Tiny tasks are allowed when the failure is isolated, the risk is high, the scope is unknown, or the tiny task unlocks a larger slice. Tiny tasks are bad when they keep happening, do not change behavior, only add wrappers/contracts/proof files, or avoid the real milestone.

## When To Use

Use this skill for goals that are broad, multi-hour, ambiguous, high-risk, already planned, already stale, already red, or likely to need Scout/Judge/Worker delegation.

For a one-change task, do not create a GoalBuddy board.

Scout and Judge tasks may identify optional extension, plugin, publishing, reporting, or channel opportunities as improvement candidates. Treat those as normal board tasks. Extensions are supporting surfaces; `state.yaml` remains board truth.

## The Four Primitives

1. **Charter**: `goal.md` says what the current tranche is trying to accomplish and what constraints matter.
2. **Board**: `state.yaml` is the rolling task list and machine truth.
3. **Task**: exactly one active task may be worked at a time.
4. **Receipt**: every completed, blocked, or escalated task leaves a compact durable result on the task card.

Agents are not a separate primitive. They are the assignee type on a task.

## Control Files

For a v2 goal, create only:

```text
docs/goals/<slug>/
  goal.md
  state.yaml
  notes/
```

The goal root may contain only `goal.md`, `state.yaml`, `notes/`, and generated `.goalbuddy-board/` files when the local visual board is enabled.

Most results live inline as task receipts in `state.yaml`. Only create `notes/<task-id>-<slug>.md` when Scout, Judge, or PM output is too large to fit on the task card.

Use:

- `templates/goal.md`
- `templates/state.yaml`
- `templates/note.md`

## Charter

The charter answers:

```text
What did the user originally ask for?
What are we trying to improve?
What input shape did the intake identify?
What constraints are non-negotiable?
Is this goal specific, open-ended, existing-plan, recovery, or audit?
What likely misfire must the PM avoid?
What counts as enough for the current tranche?
```

Avoid forever goals. A broad goal should define an execution tranche, for example:

```text
Discover the highest-leverage local improvements, complete successive safe verified work packages, review only at risk or phase boundaries, and keep advancing until the full outcome is complete.
```

## Board

`state.yaml` is the board and machine truth. A task card has:

```yaml
id: T001
type: scout | judge | worker | pm
assignee: Scout | Judge | Worker | PM
status: queued | active | blocked | done
objective: "<one sentence>"
inputs: []
constraints: []
expected_output: []
receipt: null
```

Worker tasks additionally require:

```yaml
allowed_files: []
verify: []
stop_if: []
```

The PM owns the board. Scout, Judge, and Worker return receipts; they do not select the next active task or mark the goal complete.

## Seed Boards

If the goal is vague, the first active task is Scout, but the seeded board should still lead toward execution. Queue Judge selection, a bounded Worker slot, and a final audit.

If the user provides an existing plan, do not ignore it and do not execute it blindly. Preserve the plan in `goal.intake.existing_plan_facts`, make the first active task PM or Judge validation, and queue Worker slices only after the plan is checked for evidence, risk, allowed files, verification, and stop conditions.

Example open-ended seed:

```yaml
tasks:
  - id: T001
    type: scout
    assignee: Scout
    status: active
    objective: "Map repo health and identify improvement candidates."
    receipt: null
  - id: T002
    type: scout
    assignee: Scout
    status: queued
    objective: "Find verification commands, flaky tests, stale docs, dependency risks, and easy safety wins."
    receipt: null
  - id: T003
    type: judge
    assignee: Judge
    status: queued
    objective: "Choose the first safe implementation task by impact, confidence, reversibility, and verification strength."
    expected_output:
      - "Decision"
      - "Exact Worker objective"
      - "allowed_files"
      - "verify"
      - "stop_if"
    receipt: null
  - id: T004
    type: worker
    assignee: Worker
    status: queued
    objective: "Execute the first safe implementation task selected by Judge."
    allowed_files: []
    verify: []
    stop_if:
      - "Need files outside allowed_files."
      - "Behavior is ambiguous."
      - "Verification fails twice."
    receipt: null
  - id: T999
    type: judge
    assignee: Judge
    status: queued
    objective: "Audit whether the implemented slice satisfies the original user outcome for this tranche."
    receipt: null
```

If the goal is specific but evidence is incomplete, start with Scout. If risk or priority is unclear, queue Judge before Worker. If evidence is adequate and implementation is bounded, the first active task may be Worker.

If the goal is audit, keep the active task read-only. Queue execution only if the user asks for fixes or approves follow-up implementation.

## Task Rules

A task is the only work that may happen.

- Scout tasks are read-only and produce findings.
- Judge tasks are read-only and produce decisions or constraints.
- Worker tasks may write only inside `allowed_files`.
- PM tasks may update control files and board state.

No implementation without an active Worker or PM task that explicitly allows it.

At most one write-capable Worker may be active. Do not run parallel Workers unless `state.yaml` proves disjoint write scopes and the user explicitly asked for parallel agent work.

## Receipts

A receipt is compact proof that the task happened and what it changed, learned, decided, blocked, or spawned.

Scout receipt:

```yaml
receipt:
  result: done
  summary: "Found three high-leverage candidates: flaky auth tests, missing router coverage, stale build docs."
  evidence:
    - test/auth/session.test.ts
    - src/router/index.ts
    - README.md
  spawned_tasks:
    - T004
```

Judge receipt:

```yaml
receipt:
  result: done
  decision: "approved"
  full_outcome_complete: false
  rationale: "Router coverage is verified; continue with the next PM-selected work package."
  blocked_tasks:
    - T005
```

Worker receipt:

```yaml
receipt:
  result: done
  changed_files:
    - src/billing/router.ts
    - test/billing/router.test.ts
  commands:
    - cmd: git diff --check
      status: pass
    - cmd: npm test -- test/billing/router.test.ts
      status: pass
  summary: "invoice.paid now routes through eventRouter.dispatch; regression test added."
```

For long findings or decisions, write `notes/<task-id>-<slug>.md` and point to it:

```yaml
receipt:
  result: done
  note: notes/T001-repo-map.md
  summary: "Repo map completed; three candidate tranches found."
```

## Computed Gate

Do not store manual gate booleans.

The gate is computed from the active task:

- active Scout: edits are not allowed; receipt must include findings or a note.
- active Judge: edits are not allowed; receipt must include a decision.
- active Worker: edits are allowed only inside `allowed_files`; receipt must include changed files and commands.
- active PM: edits are limited to control files unless the task explicitly allows otherwise.

If verification is red, stale, blocked, or unknown, choose recovery, Scout, Judge, or PM board work before feature work.

## Blocked Does Not Mean Stop

Blocked tasks do not necessarily block the goal. The PM should keep doing safe local board work when possible:

- create a Scout task to improve evidence;
- create a Judge task to resolve ambiguity;
- create a Worker task for the largest reversible local work package that can proceed;
- write or update a note for handoff;
- update receipts and verification freshness.

Avoid setting `goal.status: blocked` for missing input, credentials, production access, destructive-operation permission, or policy decisions. Block the specific task instead, record the missing requirement, and continue with every safe local workaround or adjacent slice.

## Operator Escalation

When Scout, Judge, Worker, or PM discovers a problem, improvement opportunity, product suggestion, follow-up repair, or tool limitation that should not be fixed inside the current active task, do not let it disappear in chat.

The PM may create a board task to prepare a repo-native follow-up. If the user has already approved publishing and the repo/auth state supports it, the PM may create an issue or PR directly and record the link in the receipt. Otherwise, ask the operator one concise question before creating the external artifact:

```markdown
I found [problem or suggestion].

Should I:
1. Create an issue in this repo for it? (Recommended) - [why]
2. Prepare a PR for the fix/suggestion - [when this is better]
3. Keep it only in the GoalBuddy board for now - [tradeoff]
```

Use an issue for follow-up work, unclear scope, missing approval, or suggestions that need discussion. Use a PR when the fix is already implemented or safely implementable within the current approved scope. If neither is appropriate, propose a different path and record the decision in `state.yaml`.

External issues and PRs are supporting artifacts, not board truth. `state.yaml` remains authoritative, and every issue/PR creation or decision must be reflected in a PM, Worker, or Judge receipt.

## Continuation Rule

After a task completes, immediately write its receipt and select the next active task unless:

- a final audit proves the full original owner outcome is complete.

Do not stop at "ready for implementation" when a safe Worker task exists. Activate the Worker, execute it, verify it, and keep going.

Do not stop after one verified work package when the broader owner outcome still has safe local follow-up work. Advance the board to the next work package unless a risk boundary or final audit is due.

Do not create a Judge task after every Worker by default. Use Judge only for phase boundaries, high-risk changes, unclear scope, rejected verification, or final completion. Repeated same-shape work belongs in one Worker package.

Do not stop because the current slice needs owner input, credentials, production access, destructive operations, or policy decisions. Mark that slice blocked, spawn or activate the smallest safe local task that can proceed around the blocker, and continue.

Do not mark a goal or tranche done while any queued or active Worker task is still required for the user's original outcome. Complete it, block it with a receipt, or replace it with a smaller safe Worker task.

Do not end with an active task marked done.

Run the checker when available:

```bash
node <skill-path>/scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml
```

If the checker and your judgment disagree, choose the more conservative state.

## Agents

Scout, Worker, and Judge templates are bundled with GoalBuddy. They may also be installed as user or project agent configs, but a board must not claim `installed` unless the preparer verified the matching agent files.

Use these `state.yaml` values:

| State | Meaning | Next action |
|---|---|---|
| `installed` | Matching Scout/Worker/Judge agent configs were found in the expected user or project agent location. | Continue. |
| `bundled_not_installed` | The bundled `goal_*.toml` template exists with the skill, but no matching installed agent config was verified. | `/goal` can proceed through PM fallback. If dedicated agents are required before `/goal`, run `npx goalbuddy agents`. |
| `missing` | Neither an installed config nor the bundled template was verified. | `/goal` can proceed through PM fallback. If dedicated agents are required before `/goal`, run `npx goalbuddy install`. |
| `unknown` | Agent availability could not be checked. | `/goal` can proceed through PM fallback. To check before `/goal`, run `npx goalbuddy doctor`. |

Non-`installed` states are warnings, not false failures, because the main `/goal` PM can perform Scout/Judge/Worker-shaped tasks directly when dedicated agents are unavailable.

| Agent | Thinking level | Write access | Use for |
|---|---:|---:|---|
| Scout | low | no | targeted source/spec/repo evidence mapping |
| Worker | medium | yes, bounded | one coherent bounded useful slice |
| Judge | high | no | phase/risk/final review, ambiguity, scope, completion skepticism |

A task's `assignee` determines the agent. The task card is the order. The receipt is the return format.

Only the main `/goal` PM may choose the active task, update the board, mark tasks done, or mark the goal complete.

## PM Thinking Policy

The main `/goal` thread is the PM. It owns board truth, chooses active tasks, decides when Scout/Judge/Worker receipts are sufficient, and records completion.

Recommended PM thinking:

| Goal mode | PM thinking |
|---|---:|
| specific, bounded | medium |
| open-ended | high |
| recovery | high |
| audit | high |
| high-risk or multi-day final audit | xhigh optional |

Do not use `xhigh` by default. Use it only when a wrong board, scope, or completion decision would be materially more expensive than latency and cost.

Tasks may include an optional `reasoning_hint` field:

```yaml
reasoning_hint: default # default | low | medium | high | xhigh
```

Treat `reasoning_hint` as PM guidance. It does not override task scope, write permissions, stop conditions, or the one-active-task rule.

## Execution Quality Commands

Use `goalbuddy prompt docs/goals/<slug>` to render a compact prompt for the active task. The prompt includes only task-specific material, safe agent metadata, continuation warnings, and the expected receipt shape. It should not include broad chat history or dump the whole state file.

When dispatching Codex subagents from a GoalBuddy prompt, the `required_spawn_agent_type` is mandatory. Use that exact `spawn_agent` `agent_type` (`goal_scout`, `goal_worker`, or `goal_judge`). Do not substitute generic `scout`, `worker`, or `judge` agents; if the required GoalBuddy agent is unavailable, stop spawning and continue as PM fallback or run `npx goalbuddy agents`/`npx goalbuddy install`. After one `wait_agent` timeout with no visible allowed-file changes, stop waiting, record the timeout, and recover deterministically instead of waiting forever.

Use `goalbuddy parallel-plan docs/goals/<slug>` when the user explicitly asks for parallel agent work. It is read-only: it recommends safe Scout/Judge handoffs and Worker handoffs only when write scopes are known and disjoint. It does not mutate `state.yaml`, create sub-goals, apply receipts, or spawn agents.

## Completion

Never complete because work looks substantial.

Completion is a Judge or PM audit task. The goal is done only when a final done Judge or PM receipt says the full original outcome is complete and maps completion to current receipts, verification, and the user's original outcome.

For execution goals, completion also requires implementation evidence. A final audit cannot call the goal done if the only completed work is planning, discovery, or task selection.

For continuous execution goals, the final audit receipt must include `full_outcome_complete: true`. If the receipt only proves that the current work package or tranche is complete, keep the goal active and queue or activate the next safe Worker/PM task. Add a Judge only when the next decision is a phase, risk, ambiguity, rejected verification, or final completion review.

Queued or active Worker tasks block `goal.status: done`. If a Worker is no longer required, mark it blocked with a receipt explaining why, remove it during PM board maintenance, or replace it with the actual required Worker task before completion.

Default final task:

```yaml
- id: T999
  type: judge
  assignee: Judge
  status: queued
  objective: "Audit whether the current tranche is complete."
  inputs:
    - "All done task receipts"
    - "Last verification"
    - "Current dirty diff"
  expected_output:
    - "complete | not_complete"
    - "full_outcome_complete: true | false"
    - "missing evidence"
    - "next task if not complete"
  receipt: null
```

## Default `/goal` Shape

```text
/goal Follow docs/goals/<slug>/goal.md.
```
