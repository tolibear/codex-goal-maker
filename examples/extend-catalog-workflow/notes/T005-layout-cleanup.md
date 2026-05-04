# T005: Skill Package Layout Cleanup

Task: `T005`
Kind: `worker`
Status: `done`

## Summary

Separated package-only infrastructure from the installable skill payload while keeping the repo root clean.

Commit:

- `6faa5de Clean skill package layout`

## Files Touched

- `AGENTS.md`
- `CONTRIBUTING.md`
- `README.md`
- `extend/README.md`
- `goal-maker/SKILL.md`
- `goal-maker/bin/goal-maker.mjs` -> `internal/cli/goal-maker.mjs`
- `goal-maker/test/*.test.mjs` -> `internal/test/*.test.mjs`
- `package.json`

## Result

The installable skill payload is now focused:

```text
goal-maker/
  SKILL.md
  agents/
  scripts/
  templates/
```

Package/dev infrastructure is grouped under:

```text
internal/
  cli/
  test/
```

Root `AGENTS.md` now tells future agents to consider README, SKILL.md, templates, checker behavior, CLI UX, examples, package contents, and extension catalog design when improving this repo.
