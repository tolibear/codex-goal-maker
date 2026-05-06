# PR Handoff: Add GitHub PR Workflow Extension

## Suggested Title

Add GitHub PR workflow extension

## Summary

- Adds `github-pr-workflow` as a cataloged Goal Maker extension.
- Documents a local-first workflow for turning goal receipts into GitHub PR handoff text.
- Keeps `state.yaml` authoritative and treats GitHub PR content as generated review context.

## Goal Context

- Original request: `$goal-maker add a new extension to goal-maker`
- Target outcome: a discoverable GitHub PR workflow integration extension with catalog metadata, docs, and example proof.
- Completion proof: catalog entry, extension documentation, example artifact, and local checks.

## Changed Files

- `extend/catalog.json`
- `extend/README.md`
- `extend/github-pr-workflow/README.md`
- `extend/github-pr-workflow/extension.yaml`
- `examples/github-pr-workflow-extension/pr-handoff.md`
- `README.md`

## Verification

```bash
node internal/cli/goal-maker.mjs extend --catalog-url extend/catalog.json --json
node internal/cli/goal-maker.mjs extend github-pr-workflow --catalog-url extend/catalog.json --json
node internal/cli/goal-maker.mjs extend install github-pr-workflow --catalog-url extend/catalog.json --dry-run --json
npm run check
git diff --check
```

## Review Notes

- This is a local handoff workflow, not live GitHub automation.
- No GitHub token is required for discovery, details, or install dry-run.
- Future live PR creation should be a separate extension or explicitly approved follow-up task.

## Follow-Up

- Consider a later command or template generator only after the cataloged workflow proves useful.
