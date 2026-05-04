# Extend Catalog Workflow

## Objective

Design and implement Goal Maker's extension catalog workflow so optional features can move through GitHub-hosted extension metadata without requiring frequent npm package releases.

## Goal Kind

`open_ended`

## Current Tranche

Decide the product language and architecture for optional extensions, implement the first catalog-backed `extend` CLI workflow, add a visible root `extend/` surface, clean the skill/package layout, and leave a reviewable completion audit.

## Non-Negotiable Constraints

- `state.yaml` remains the only board truth.
- Extensions are optional support surfaces, not the control plane.
- Use `extend` as the repo surface and `extensions` as the item name.
- Avoid implying bidirectional sync with external services.
- Keep npm as the stable core; catalog entries should be updateable from GitHub.
- Keep package-only infrastructure out of the installable skill payload.
- Do not require provider credentials for discovery or dry-run installation.

## Stop Rule

Stop when the extension/catalog UX is implemented, the repo layout reflects the skill/package boundary, verification passes, and the final audit maps the shipped changes to receipts and commits.

## Canonical Board

Machine truth lives at:

`examples/extend-catalog-workflow/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow examples/extend-catalog-workflow/goal.md
```

## PM Loop

On every `/goal` continuation:

1. Read this charter.
2. Read `state.yaml`.
3. Work only on the active board task.
4. Assign Scout, Judge, Worker, or PM according to the task.
5. Write a compact task receipt.
6. Update the board.
7. Select the next active task or finish with a Judge/PM audit receipt.
