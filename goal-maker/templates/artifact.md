---
unit: U-001
kind: scout # scout | judge | audit | owner-packet | staging-slice | commit-slice | verification | completion | archive
status: current # current | superseded | blocked
created_at: "<iso timestamp>"
supersedes: []
source_evidence: []
---

# <Artifact Title>

## Purpose

<Why this artifact exists and what decision, blocker, or evidence chain it supports.>

## Findings

- <Finding with source/spec/command evidence.>

## State References

- `state.yaml`: <row or field this artifact supports>
- `evidence.jsonl`: <event id or unit transition this artifact supports>

## Next Action

<Exact next state-machine action, owner input, or blocker classification.>
