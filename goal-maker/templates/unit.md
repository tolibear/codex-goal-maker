# U-001: <One reviewable state transition>

Status: active # ready | active | blocked | reviewable | done
Type: recovery # implementation | recovery | review | decision | cleanup
Assigned agent: PM # PM | Scout | Worker | Judge
Attempts: 0

## Objective

<One sentence. What verified state transition should be true after this unit?>

## Evidence

Use only this evidence for behavior decisions.

```text
<source excerpt, spec excerpt, command output, reproduction, or decision record>
```

## Allowed files

- <exact/path/or/subsystem>

## Non-goals

- Do not broaden scope.
- Do not change product behavior without evidence.
- Do not claim parity or completion.
- Do not fix unrelated tests.

## Commands

```bash
git diff --check
<focused command>
<required affected-package command>
```

## Stop if

- source behavior is ambiguous;
- product/API/live strategy is required;
- files outside allowed scope are needed;
- verification fails twice;
- diff exceeds thresholds in `state.yaml`.

## Done when

- acceptance criteria are met;
- commands pass or a precise blocker is recorded;
- `state.yaml` is updated;
- `evidence.jsonl` records the transition.
