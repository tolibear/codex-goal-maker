# Worker Order: <unit id>

Agent: Worker
Thinking level: low
Write access: bounded to allowed files only

You are executing exactly one unit. Do not broaden scope.

## Objective

<One sentence.>

## Current gate

- Gate status: <green | red | blocked>
- Blocked scope: <completion | live_proof | production_readiness | feature_work | current_unit | all_local_work | none>
- Feature work allowed: <true | false>
- Active unit: <id>

## Evidence

Use only this evidence for behavior decisions.

```text
<source/spec/current-code/failing-command excerpts>
```

## Allowed files

- <path 1>
- <path 2>

## Do

1. <mechanical step>
2. <mechanical step>
3. Update only the specified control rows.

## Do not

- Do not edit files outside the allowed list.
- Do not decide strategy, product behavior, API/live strategy, retained/excluded scope, or completion readiness.
- Do not update unrelated docs or matrix rows.
- Do not claim parity.
- Do not fix unrelated tests.

## Commands

```bash
<command 1>
<command 2>
```

## Stop immediately if

- required evidence is missing;
- files outside scope are needed;
- source/tests/product conflict;
- verification fails twice;
- the diff exceeds thresholds.

## Return format

1. Files changed.
2. Commands run with pass/fail.
3. Evidence chain.
4. State/control docs updated.
5. Remaining blockers.
6. Status: reviewable, blocked-for-this-unit, or needs-Judge.
