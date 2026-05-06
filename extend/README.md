# Extend

Optional Goal Maker extensions live here as subfolders when they are ready to ship.

The npm package reads the GitHub-hosted catalog at `extend/catalog.json`, so adding or updating extension entries here does not require an npm release.

Each extension folder should contain the files referenced by `extend/catalog.json`. Keep catalog entries checksum-pinned so `goal-maker extend install <id>` can verify downloads before copying them into a local Codex install.

## Extensions

- `github-pr-workflow`: prepares GitHub pull request handoff text from Goal Maker receipts while keeping `state.yaml` authoritative.
- `codebase-onboarding-map`: creates a concise onboarding map from repo files, commands, conventions, and receipts.
- `slack-standup-digest`: prepares Slack-ready status digests while keeping live delivery credential-gated.
- `linear-ticket-handoff`: prepares Linear-ready issue text while keeping live issue creation credential-gated.
- `test-gap-planner`: identifies weak test coverage and proposes the smallest useful next tests.
- `release-readiness`: assembles release scope, verification, docs, packaging, and publish blockers.
- `dependency-upgrade-planner`: plans dependency upgrades with policy fit, migration risk, verification, and rollback notes.
- `security-review-brief`: prepares a focused local security review brief from changed files and receipts.
- `ai-diff-risk-review`: prepares a local risk review brief for AI-assisted or agent-produced diffs.
- `ci-failure-triage`: summarizes failed checks, logs, changed files, and receipts into recovery-focused next steps.
- `docs-drift-audit`: checks changed behavior and documentation surfaces for stale or missing docs before completion or PR handoff.

## Catalog Rules

- Keep extension ids lowercase and kebab-cased.
- Keep file URLs relative to `extend/catalog.json` unless they intentionally point elsewhere.
- Keep every listed file checksum-pinned with SHA-256.
- Keep credential-dependent live actions separate from local documentation and dry-run workflows.

## Discovery Metadata

Catalog entries may include lightweight fields that help agents decide when and how to use an extension:

- `use_when`: human-readable triggers for when an agent should consider the extension.
- `activation`: the Goal Maker lifecycle phase where the extension fits, such as `final_audit`, `publish_handoff`, `user_requested`, `before_worker`, `after_worker`, or `blocked_task`.
- `outputs`: artifacts or results the extension is expected to produce.
- `requires_approval`: whether an agent should ask before using the extension.
- `safe_by_default`: whether the extension can run locally without credentials, destructive changes, or external side effects.

These fields are advisory. They help agents discover optional extensions without making the extension authoritative. `state.yaml` remains board truth.
