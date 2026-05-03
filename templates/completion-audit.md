# Completion Audit

Do not mark a big `/goal` complete until this table is current.

| Criterion | Evidence | Command result | State row | Status |
|---|---|---|---|---|
| <criterion> | <source/spec/decision -> implementation -> test> | <command + pass/fail + fingerprint> | <state.yaml path/row> | <done/blocked/stale> |

Completion is blocked if any row is:

- stale;
- red;
- blocked;
- externally gated;
- missing source/spec/decision evidence;
- missing deterministic verification;
- unreviewable as a diff or bundle.

Final state must say:

```yaml
audit:
  completion_allowed: true
  reason: "all criteria map to current evidence and command truth"
```
