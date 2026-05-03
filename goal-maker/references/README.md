# Goal Maker Reference

Keep the runtime simple:

```text
State is truth.
Gate decides permission.
Unit is the only work.
Evidence proves progress.
Agents are tools.
Red means recovery.
Done means audit.
```

## Default thresholds

- one active unit
- at most one write-capable worker
- 8 files per unit unless explicitly justified
- 800 diff lines per unit unless explicitly justified
- two failed attempts before Judge escalation
- no unclassified untracked artifacts in reviewable state

## Behavioral evidence chain

```text
source/spec/decision
  -> implementation
  -> positive test
  -> negative/safety test if needed
  -> verification result
  -> state update
```
