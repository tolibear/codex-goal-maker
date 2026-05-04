# T003: Catalog CLI Implementation

Task: `T003`
Kind: `worker`
Status: `done`

## Summary

Implemented the first catalog-backed `goal-maker extend` workflow.

Commit:

- `105850e Add extension catalog workflow`

## Shipped Behavior

- `goal-maker extend` reads the GitHub-hosted catalog and reports available/install/configuration state.
- `goal-maker extend <id>` shows extension details.
- `goal-maker extend install <id>` installs checksum-verified extension files.
- `goal-maker extend doctor [id]` validates installed extension files and required environment.
- Root `catalog.json` provides an initially empty GitHub-hosted catalog.
- README documents the extension discovery/install flow.

## Files Touched

At this point in the run, the CLI still lived under `goal-maker/bin/`. A later cleanup task moved it to `internal/cli/`.

- `README.md`
- `catalog.json`
- `goal-maker/bin/goal-maker.mjs`
- `goal-maker/test/goal-maker-cli.test.mjs`
- `package.json`

## Verification

Commands passed:

```bash
npm run check
git diff --check
node goal-maker/bin/goal-maker.mjs extend --catalog-url catalog.json --json
npm publish --dry-run --json
```
