# Extend

Optional Goal Maker extensions live here as subfolders when they are ready to ship.

The npm package reads the GitHub-hosted catalog at `extend/catalog.json`, so adding or updating extension entries here does not require an npm release.

Each extension folder should contain the files referenced by `extend/catalog.json`. Keep catalog entries checksum-pinned so `goal-maker extend install <id>` can verify downloads before copying them into a local Codex install.

## Extensions

- `github-pr-workflow`: prepares GitHub pull request handoff text from Goal Maker receipts while keeping `state.yaml` authoritative.

## Catalog Rules

- Keep extension ids lowercase and kebab-cased.
- Keep file URLs relative to `extend/catalog.json` unless they intentionally point elsewhere.
- Keep every listed file checksum-pinned with SHA-256.
- Keep credential-dependent live actions separate from local documentation and dry-run workflows.
