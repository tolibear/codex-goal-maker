# Dependency Upgrade Planner

Plan dependency updates before changing package manifests or lockfiles.

This extension is local-first. It helps a GoalBuddy run evaluate candidate dependency upgrades, runtime policy, migration notes, verification commands, and rollback options. It does not edit dependency files or contact a package registry by default.

## Use When

- A goal proposes updating dependencies, toolchain versions, or package manager files.
- A repo has a dependency-free or low-dependency policy that must stay visible.
- A Worker needs a bounded upgrade plan before touching manifests or lockfiles.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Repo dependency manifests and lockfiles
- Existing dependency policy from README, AGENTS, or package docs
- Relevant release notes supplied by the PM or user
- Verification command output

## Output

A dependency upgrade plan with:

- Proposed upgrade scope
- Policy fit
- Migration risk
- Verification commands
- Rollback plan
- Blocked live checks or missing release-note evidence

## Boundaries

- This extension does not edit manifests or lockfiles.
- It does not fetch registry metadata by default.
- Network-backed version research should be a Scout task or explicitly approved extension behavior.
- Dependency changes require a bounded Worker task.
