# GitHub Projects

Mirror a GoalBuddy `state.yaml` board into GitHub Projects without making GitHub the source of truth.

This extension ports the GitHub Projects work from PR #1 into the catalog-based extension system. It keeps the package core dependency-free and optional, while giving teams a practical way to publish a GoalBuddy board into a familiar project surface.

## Use When

- A long-running GoalBuddy board needs stakeholder visibility in GitHub Projects.
- A team wants one-way sync from `state.yaml` into ProjectV2 draft issues.
- The PM needs a dry-run plan before using GitHub credentials.
- Existing GoalBuddy receipts, verification commands, allowed files, owners, and dependencies should be visible in a board layout.

## What It Creates

The live sync ensures a GitHub Project has:

- Draft issues keyed by `Task ID`, so reruns update existing cards instead of duplicating them.
- Status mapping: `queued -> Todo`, `active -> In Progress`, `blocked -> Blocked`, `done -> Done`.
- Single-select fields for `Status`, `Priority`, `Work Type`, and `Agent Lane`.
- Text fields for `Task ID`, `Owner`, `Goal Role`, `Agent Responsible`, `Credential Gate`, `Parent ID`, `Depends On`, `Receipt Summary`, `Verify`, `Allowed Files`, and `Goal Updated`.
- A `Goal Board` board-layout view for PM flow.

The sync only creates or reuses `Goal Board`. It does not create a default Table view, an `Agent Workboard`, or extra role-specific views. GitHub may still show views that already existed on the Project.

The extension does not promise custom board grouping or sort order. GitHub's public Project views REST API currently accepts `name`, `layout`, `filter`, and `visible_fields` when creating a view, and GraphQL exposes grouping/sort fields for reading but not a public mutation for saving them. Because that display state cannot be written reliably through the public API, the sync only creates supported fields, cards, and the single `Goal Board` view.

## Inputs

- `docs/goals/<slug>/state.yaml`
- Optional `GITHUB_PROJECT_ID`
- Optional `GITHUB_PROJECT_OWNER` and `GITHUB_PROJECT_NUMBER`
- `GITHUB_TOKEN` or `GH_TOKEN` for live sync

## Dry Run

Dry-run mode does not call GitHub:

```bash
node extend/github-projects/scripts/sync-github-project.mjs \
  --state docs/goals/<slug>/state.yaml \
  --dry-run
```

For structured output:

```bash
node extend/github-projects/scripts/sync-github-project.mjs \
  --state docs/goals/<slug>/state.yaml \
  --dry-run \
  --json
```

## Live Sync

Use a ProjectV2 node ID:

```bash
GITHUB_TOKEN=... node extend/github-projects/scripts/sync-github-project.mjs \
  --state docs/goals/<slug>/state.yaml \
  --project-id <project-node-id>
```

Or use an owner and project number:

```bash
GITHUB_TOKEN=... node extend/github-projects/scripts/sync-github-project.mjs \
  --state docs/goals/<slug>/state.yaml \
  --owner <user-or-org> \
  --project-number <number>
```

Environment alternatives:

- `GITHUB_PROJECT_ID`
- `GITHUB_PROJECT_OWNER`
- `GITHUB_PROJECT_NUMBER`
- `GITHUB_TOKEN` or `GH_TOKEN`

## Verification

```bash
node --test extend/github-projects/test/*.test.mjs
node extend/github-projects/scripts/sync-github-project.mjs \
  --state extend/github-projects/examples/goal-board-sync/state.yaml \
  --dry-run
node extend/github-projects/scripts/sync-github-project.mjs \
  --state extend/github-projects/examples/goal-board-sync/state.yaml \
  --dry-run \
  --json
```

## Boundaries

- `state.yaml` remains authoritative.
- The sync is one-way from GoalBuddy to GitHub Projects.
- Missing GitHub credentials block only live sync, not local dry-run validation.
- Live sync creates or updates GitHub Project draft issues and fields.
- Native GitHub issue hierarchy and dependencies are represented as fields because ProjectV2 draft issues do not provide full issue relationship semantics.
