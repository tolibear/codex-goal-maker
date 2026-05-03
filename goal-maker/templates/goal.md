# <Goal Title>

## Objective

<User-editable goal objective.>

## Canonical State

Machine truth lives at:

`docs/goals/<slug>/state.yaml`

If this file and `state.yaml` disagree, `state.yaml` wins for execution permission, active unit, gate status, verification status, and completion truth.

## Run Command

```text
/goal Follow docs/goals/<slug>/goal.md
```

## Loop Contract

On every `/goal` continuation:

1. Read this brief.
2. Read `state.yaml`.
3. Observe repo and control state.
4. Update the gate.
5. Execute or delegate at most one active unit.
6. Verify.
7. Append evidence.
8. Update state.
9. Stop only when completion audit passes or `blocked_scope` includes `all_local_work`.

## Assumptions And Open Questions

- <Assumption or question.>

## Completion Criteria

- <Criterion that must map to evidence and command truth.>
