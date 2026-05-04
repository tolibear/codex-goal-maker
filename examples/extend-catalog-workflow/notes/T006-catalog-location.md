# T006: Catalog Location

Task: `T006`
Kind: `worker`
Status: `done`

## Summary

Moved the hosted catalog from the repo root to `extend/catalog.json`.

Commit:

- This example/catalog-location commit.

## Why

The repo root should stay relatively clean, and `catalog.json` is part of the extension surface. Keeping it under `extend/` makes the shape easier to understand:

```text
extend/
  README.md
  catalog.json
  <extension-id>/
```

The npm CLI still reads the catalog from GitHub raw, now at:

```text
https://raw.githubusercontent.com/tolibear/goal-maker/main/extend/catalog.json
```

## Files Touched

- `catalog.json` -> `extend/catalog.json`
- `internal/cli/goal-maker.mjs`
- `README.md`
- `AGENTS.md`
- `extend/README.md`
- `examples/extend-catalog-workflow/`

## Verification

Commands to verify this task:

```bash
npm run check
git diff --check
node internal/cli/goal-maker.mjs extend --catalog-url extend/catalog.json --json
npm publish --dry-run --json
```
