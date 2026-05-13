---
name: deep-intake
description: Deep Intake for GoalBuddy. Use when the user explicitly wants to sharpen, spar through, ground, or pressure-test a broad, strategic, vague, risky, or emotionally loaded goal before /goal. Runs pre-alignment, then compiles through the canonical sibling goal-prep skill spec, templates, and checkers with raw input, discussion, quality notes, anti-misfire fences, and a /goal handoff. Does not execute the goal.
---

# Deep Intake

`$deep-intake` (Codex) or `/deep-intake` (Claude Code) prepares a GoalBuddy
board through a deeper alignment route. It is a pre-alignment layer that compiles
through the canonical sibling `goal-prep` skill spec, templates, and checkers. It
does not start `/goal`.

Deep Intake is self-contained and GoalBuddy-native. It does not depend on any
external planning skill, prior local experiment, product-specific audit script,
or repository-specific agent.

## Boundary

Allowed actions:

- ask focused intake and sparring questions, one at a time;
- perform narrow grounding reads only when a material question depends on repo truth;
- create or repair only `docs/goals/<slug>/goal.md`, `docs/goals/<slug>/state.yaml`, `docs/goals/<slug>/notes/`, and the generated `.goalbuddy-board/` artifact;
- run the GoalBuddy update checker and `check-goal-state.mjs` from the sibling `goal-prep` skill when available;
- create or open the selected visual board surface;
- print exactly `/goal Follow docs/goals/<slug>/goal.md.`;
- ask whether to start `/goal`, refine the board, or stop.

Do not implement the user's requested work. Do not run broad repo exploration,
load unrelated named skills, browse reference repos, generate design assets, or
produce product plans that belong to the later `/goal` run. If broader discovery
is needed, seed a Scout task instead.

## Canonical Compiler Source

Deep Intake owns the alignment layer, not a second copy of Goal Prep's board
logic. Before writing final artifacts, read the sibling `goal-prep/SKILL.md` and
use it as the compiler source of truth for generic GoalBuddy behavior.

Use the current `goal-prep` sections for:

- invocation boundary and prepare-only limits;
- Intake Compiler fields;
- visual board handling;
- goal kind and seed-board shape;
- control files and root layout;
- Task Rules, Receipts, Completion, and PM loop expectations.

If Deep Intake instructions conflict with `goal-prep`, `goal-prep` wins for
generic GoalBuddy board behavior. Deep Intake wins only for the added alignment
requirements: `notes/raw-input.md`, `notes/discussion.md`, `notes/quality.md`,
Deep Intake Source Bundle, Deep Intake Trace, and the Deep Intake artifact
checker. This keeps future Goal Prep improvements flowing into Deep Intake
without maintaining a second divergent board compiler.

## Intake Loop

Default to a deep route for broad, strategic, multi-domain, recovery,
architecture, UX, or high-risk goals. Ask at least three material sparring
questions before writing the board unless the user explicitly says to use
defaults, ask no questions, or prepare only the board. Even then, ask one
blocking question if authority, destructive scope, safety, or completion proof
would otherwise be materially ambiguous.

Ask position-first questions: state the recommended direction and why, then
offer two or three meaningful choices. After each answer, reflect the decision
briefly using the user's own terminology, name the next blind spot, and ask the
next question.

The loop may close only when all of these are clear enough to make a falsifiable
board:

- goal and beneficiary;
- success criteria and observable completion proof;
- likely misfire;
- disappointment or anti-pattern fences;
- scope and non-goals;
- first board shape and safest initial active task;
- per-deliverable vision anchors (when the user's input carries distinctive verbatim phrasing — see Verbatim-Term Mining below).

Ask this once during the route:

```text
What would disappoint you -- how would you notice that /goal reported done but built the wrong thing?
```

Convert the answer into `likely_misfire`, Anti-Patterns, and final-audit
rejection criteria.

### Verbatim-Term Mining

The Intake Loop is the right place to mine the user's distinctive verbatim
phrasing — coined terms, load-bearing abstractions, named concepts they
specifically want preserved through `/goal` execution. Without anchored
terminology, a task can pass its `verify` commands while drifting from the
meaning the user wanted preserved. Mining is integral to deep alignment, not
optional decoration.

During each sparring turn:

1. When the user uses a distinctive phrase (a coined term, a non-standard
   compound, an emotionally weighted word), capture it verbatim into
   `notes/discussion.md` as part of the resolution. Reflect the decision back
   in the user's own wording — do not paraphrase. ("OK — so the *Harnessmitte*
   is `onari-ambient`, not 'the harness core layer'.")
2. After enough sparring to draft the deliverables, propose a mapping from
   distinctive verbatim terms to specific tasks. Each task that maps to a
   numbered deliverable should carry one anchor term — the load-bearing phrase
   that deliverable promises to preserve.
3. Ask the user to confirm or adjust the mapping in one AskUserQuestion turn:
   "I'm binding 'X' as the anchor of D2 and 'Y' as the anchor of D3 — meaning
   if implementation drifts from those abstractions, the deliverables aren't
   done even if verify commands exit 0. Confirm or adjust?"

If a candidate deliverable has no distinctive verbatim anchor — only generic
wording — that is a signal the deliverable is too generic. Keep probing the
sparring loop until a load-bearing term surfaces, or split the deliverable
into two more-anchored ones, or accept it without an anchor (set
`vision_anchor: null` in state.yaml; the SATISFACTION rule will not fire).
Generic deliverables without anchors are still valid — but they lose the
per-deliverable vision-fidelity gate that `check-goal-state.mjs` enforces.

## Grounding Reads

Grounding reads are allowed only to sharpen intake. Use 1-2 targeted file reads
or searches per material technical question. Record what was checked and what it
changed in `notes/discussion.md`. Do not let grounding reads become Scout work;
if the question needs a broader map, create a Scout task.

## Artifacts

Write these files under `docs/goals/<slug>/`:

- `notes/raw-input.md`: the user's original request and important follow-up wording.
- `notes/discussion.md`: resolved decisions, user terminology, disagreement points, scoped-out items, and grounding-read findings.
- `notes/quality.md`: the Deep Intake quality gate result.
- `goal.md`: a GoalBuddy charter with the Deep Intake decisions embedded in the normal Intake Summary, constraints, completion proof, likely misfire, and non-goals.
- `state.yaml`: a GoalBuddy v2 board with exactly one active task.

Use GoalBuddy conventions from the sibling `goal-prep` skill. If this skill is
installed next to `goal-prep`, use `../goal-prep/templates/goal.md`,
`../goal-prep/templates/state.yaml`, and `../goal-prep/templates/note.md` as the
artifact source of truth. Do not invent a divergent schema.

`state.yaml` must route the Deep Intake notes into execution:

- the first Scout, Judge, or PM validation task lists `notes/raw-input.md`,
  `notes/discussion.md`, and `notes/quality.md` as inputs;
- `T999` lists those notes as inputs and rejects completion when the result
  contradicts the Deep Intake decisions or likely-misfire fences.

## Compile Contract

Compile Deep Intake artifacts through the current Goal Prep compiler surface:

0. Read `../goal-prep/SKILL.md` and the sibling templates immediately before
   artifact compilation. Do not reconstruct Goal Prep seed-board logic from
   memory.
1. Fill `goal.md` from the Goal Prep charter template and embed Deep Intake
   decisions in the normal Intake Summary, constraints, completion proof, likely
   misfire, and anti-pattern fences. For each numbered deliverable, embed an
   explicit `Vision-Anchor: "<verbatim user phrase>"` inline clause when an
   anchor was bound during Verbatim-Term Mining. Deliverables without anchors
   omit the clause and rely on the standard verify/audit gates.
2. Add a `## Goal Prep Compiler Source` section to `goal.md`. It must state the
   board was compiled against the current sibling `goal-prep/SKILL.md` and Goal
   Prep templates/checkers.
3. Add a `## Deep Intake Source Bundle` section to `goal.md`. It must list
   `notes/raw-input.md`, `notes/discussion.md`, and `notes/quality.md`, and it
   must state that the `/goal` PM reads those three files before selecting,
   advancing, or auditing tasks.
4. Add a `## Deep Intake Trace` section to `goal.md`. It maps the user's
   important wording and resolved discussion decisions to the concrete board
   choices they produced: completion proof, likely misfire, non-goals, first
   validation task, final audit fences, and the per-task `vision_anchor`
   bindings produced by Verbatim-Term Mining. The Trace is the audit surface
   for "what user-phrase routed to which board element?"
5. Fill `state.yaml` from the Goal Prep state template with exactly one active
   task, role-tagged tasks, truthful agent states, and normal GoalBuddy
   receipts. For each task that maps to a numbered deliverable with a confirmed
   anchor, populate `vision_anchor` with `{term, check_condition.bash,
   check_condition.judge_fallback}` — see goal-prep `## Vision Anchors`
   section for the schema. For tasks without anchors (typically T001 Scout
   discovery, generic Workers, T999 final audit), set `vision_anchor: null`.
6. Add only the Deep Intake notes under `notes/`; do not add a new root-level
   artifact type.
7. Run the normal state checker (it enforces the vision_anchor PRESENCE rule
   on every task with a non-null anchor; SATISFACTION rule activates per-task
   only when `status: done`):

   ```bash
   node ../goal-prep/scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml
   ```

8. Run the Deep Intake artifact checker:

   ```bash
   node ../goal-prep/scripts/check-deep-intake-artifacts.mjs docs/goals/<slug>
   ```

Both checkers must pass before the handoff is printed. If either checker fails,
repair the artifacts or ask another intake question.

## Quality Gate

Before printing the handoff, write `notes/quality.md` and confirm:

- `goal.md` embeds the discussion decisions, not only links to notes;
- `goal.md` identifies the Goal Prep Compiler Source;
- `goal.md` contains the Deep Intake Source Bundle and Deep Intake Trace sections;
- deliverables or tasks are falsifiable and have proof anchors, or a Scout/Judge task exists to find the proof surface;
- completion proof is observable;
- likely misfire and Anti-Patterns are present;
- scope and non-goals are explicit;
- `state.yaml` routes Deep Intake notes into the first validation task and `T999`;
- per-deliverable `vision_anchor` bindings (when present) trace verbatim back to entries in `notes/discussion.md` — every anchor.term must appear in raw-input.md or discussion.md;
- the Deep Intake Trace section documents the deliverable→anchor mapping completely;
- `check-goal-state.mjs docs/goals/<slug>/state.yaml` passes when the checker is available — this includes the vision_anchor PRESENCE rule;
- `check-deep-intake-artifacts.mjs docs/goals/<slug>` passes when the checker is available.

If the gate fails, do not print `/goal`. Ask another intake question or repair
the artifacts first.

## Handoff

Print the board path, a short quality summary, and the exact command. Use the
**complete** form (with the audit-script stop condition and turn cap) when the
prep stage generated a per-goal audit script — this is the form that gives
Claude Code's fresh Haiku evaluator a transcript-demonstrable stop signal and
prevents both premature stop and runaway overbaking:

```text
/goal Follow docs/goals/<slug>/goal.md until "<audit command>" exits 0, or stop after <N> turns.
```

When no per-goal audit script was generated (research/audit-shape goals, or
charters that only seed a Scout task), the bare form is acceptable:

```text
/goal Follow docs/goals/<slug>/goal.md.
```

Pick `<N>` to match the goal's shape: 40 turns for research/plan-shape goals,
60 turns for tactical code-execution goals, ≤20 turns for narrow single-slice
work. Calibrate to the deliverable count and the METR reliability horizon of
the executor model (~5h Opus 4.5 50% reliability). Larger spans should split
into sequenced tranches rather than push past the cliff in one cook.

Then ask whether to start `/goal`, refine the board, or stop. Do not start
`/goal` automatically.
