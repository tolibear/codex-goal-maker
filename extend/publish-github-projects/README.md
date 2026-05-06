# GitHub Projects Publishing

Publish a one-way GitHub Projects board view from a Goal Maker board.

This extension is credential-gated for live GitHub Projects updates, but the planning and dry-run handoff are useful without credentials. It helps a Goal Maker run create or refresh a project, link it to a repository, add task cards, expose agent-oriented card fields, and mirror `state.yaml` task status while keeping `state.yaml` authoritative.

## Use When

- A user asks to actively track a Goal Maker run in GitHub Projects.
- A long-running goal needs a human-visible external board while agents keep working from `state.yaml`.
- A PM wants to mirror Goal Maker task state into `Todo`, `In Progress`, `Blocked`, and `Done` columns.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- GitHub owner and repository
- Existing GitHub Project URL or title, if reusing one
- `gh auth status` and project-scope capability

## Output

A GitHub Projects publishing setup or sync receipt with:

- Project owner, number, URL, and linked repo
- Status field with `Todo`, `In Progress`, `Blocked`, and `Done`
- Card fields for `Goal Task`, `Goal Role`, `Agent Responsible`, and `Credential Gate`
- Draft issue cards for every Goal Maker task
- A `state.yaml` receipt containing project, field, option, and item IDs
- A sync rule mapping `queued`, `active`, `blocked`, and `done` to GitHub Projects status values

## Live Requirements

Live GitHub Projects publishing requires:

- GitHub CLI authentication with `project` scope
- Permission to create or update projects for the target owner
- Target owner and repository
- Explicit approval to create or mutate the GitHub Project

## Boundaries

- `state.yaml` remains authoritative.
- GitHub Projects is a published view and collaboration surface, not board truth.
- Missing GitHub credentials or project scope should block only live publishing, not local planning.
- The extension should not push branches, create pull requests, or edit issues unless a separate approved workflow allows it.
- A sync operation should write receipts before treating external board updates as durable.
