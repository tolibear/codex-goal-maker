import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const checker = resolve("goal-maker/scripts/check-goal-state.mjs");

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-test-"));
  mkdirSync(join(root, "notes"), { recursive: true });
  writeFileSync(join(root, "goal.md"), "# Sample Goal\n");
  return root;
}

function writeState(root, body) {
  writeFileSync(join(root, "state.yaml"), body.trimStart());
}

function runChecker(root) {
  const result = spawnSync(process.execPath, [checker, join(root, "state.yaml")], {
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: JSON.parse(result.stdout),
    stderr: result.stderr,
  };
}

const validScoutBoard = `
version: 2

goal:
  title: "Improve this project"
  slug: "improve-this-project"
  kind: open_ended
  tranche: "discovery-then-first-safe-improvement"
  status: active

rules:
  pm_owns_state: true
  one_active_task: true
  max_write_workers: 1
  no_implementation_without_worker_or_pm_task: true
  no_completion_without_judge_or_pm_audit: true

agents:
  scout: installed
  worker: installed
  judge: installed

active_task: T001

tasks:
  - id: T001
    type: scout
    assignee: Scout
    status: active
    objective: "Map the repo and identify improvement candidates."
    inputs:
      - README.md
      - package.json
    constraints:
      - "Read-only."
    expected_output:
      - "Repo map"
      - "Candidate tasks"
    receipt: null
  - id: T002
    type: judge
    assignee: Judge
    status: queued
    objective: "Choose the first safe tranche."
    inputs:
      - "T001 receipt"
    constraints:
      - "Do not implement."
    expected_output:
      - "Decision"
    receipt: null

checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`;

test("accepts a valid v2 board with one active Scout task", () => {
  const root = makeRoot();
  try {
    writeState(root, validScoutBoard);
    const result = runChecker(root);
    assert.equal(result.status, 0, result.stderr || JSON.stringify(result.stdout));
    assert.equal(result.stdout.ok, true);
    assert.equal(result.stdout.version, 2);
    assert.equal(result.stdout.active_task, "T001");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("accepts an active Worker only with scope, verification, and stop conditions", () => {
  const root = makeRoot();
  try {
    writeState(root, `
version: 2
goal:
  title: "Fix router coverage"
  slug: "fix-router-coverage"
  kind: specific
  tranche: "router regression coverage"
  status: active
rules:
  pm_owns_state: true
  one_active_task: true
  max_write_workers: 1
  no_implementation_without_worker_or_pm_task: true
  no_completion_without_judge_or_pm_audit: true
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: T004
tasks:
  - id: T004
    type: worker
    assignee: Worker
    status: active
    objective: "Add focused router dispatch regression coverage."
    allowed_files:
      - src/router/index.ts
      - test/router.test.ts
    verify:
      - git diff --check
      - npm test -- test/router.test.ts
    stop_if:
      - "Need files outside allowed_files."
      - "Verification fails twice."
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`);
    const result = runChecker(root);
    assert.equal(result.status, 0, result.stderr || JSON.stringify(result.stdout));
    assert.equal(result.stdout.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects legacy v1 state with gate or units schema", () => {
  const root = makeRoot();
  try {
    writeFileSync(join(root, "evidence.jsonl"), "");
    mkdirSync(join(root, "units"), { recursive: true });
    writeState(root, `
goal: "Legacy"
status: green
active_unit: U-001
gate:
  status: green
`);
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout.errors.join("\n"), /legacy v1/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects more than one active task", () => {
  const root = makeRoot();
  try {
    writeState(root, validScoutBoard.replace("status: queued", "status: active"));
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout.errors.join("\n"), /exactly one active task/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects done task without receipt", () => {
  const root = makeRoot();
  try {
    writeState(root, validScoutBoard.replace(
      `status: active
    objective: "Map the repo and identify improvement candidates."`,
      `status: done
    objective: "Map the repo and identify improvement candidates."`,
    ));
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout.errors.join("\n"), /done task T001 missing receipt/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects root evidence, units, artifacts, or stray markdown", () => {
  const root = makeRoot();
  try {
    writeState(root, validScoutBoard);
    writeFileSync(join(root, "evidence.jsonl"), "");
    mkdirSync(join(root, "units"), { recursive: true });
    mkdirSync(join(root, "artifacts"), { recursive: true });
    writeFileSync(join(root, "scout-report.md"), "# Stray\n");
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout.errors.join("\n"), /unexpected root entries/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("accepts done goal only with final Judge or PM audit receipt", () => {
  const root = makeRoot();
  try {
    writeState(root, `
version: 2
goal:
  title: "Improve docs"
  slug: "improve-docs"
  kind: specific
  tranche: "docs cleanup"
  status: done
rules:
  pm_owns_state: true
  one_active_task: true
  max_write_workers: 1
  no_implementation_without_worker_or_pm_task: true
  no_completion_without_judge_or_pm_audit: true
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: null
tasks:
  - id: T001
    type: worker
    assignee: Worker
    status: done
    objective: "Update docs."
    allowed_files:
      - README.md
    verify:
      - git diff --check
    stop_if:
      - "Verification fails twice."
    receipt:
      result: done
      changed_files:
        - README.md
      commands:
        - cmd: git diff --check
          status: pass
      summary: "Docs updated."
  - id: T002
    type: judge
    assignee: Judge
    status: done
    objective: "Audit tranche completion."
    receipt:
      result: done
      decision: complete
      summary: "Tranche complete with current verification."
checks:
  dirty_fingerprint: clean
  last_verification:
    result: pass
    task: T002
    commands:
      - cmd: git diff --check
        status: pass
`);
    const result = runChecker(root);
    assert.equal(result.status, 0, result.stderr || JSON.stringify(result.stdout));
    assert.equal(result.stdout.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects done goal with unfinished Worker task", () => {
  const root = makeRoot();
  try {
    writeState(root, `
version: 2
goal:
  title: "Improve backend automation"
  slug: "improve-backend-automation"
  kind: open_ended
  tranche: "first safe backend automation slice"
  status: done
rules:
  pm_owns_state: true
  one_active_task: true
  max_write_workers: 1
  no_implementation_without_worker_or_pm_task: true
  no_completion_without_judge_or_pm_audit: true
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: null
tasks:
  - id: T001
    type: scout
    assignee: Scout
    status: done
    objective: "Map backend automation gaps."
    receipt:
      result: done
      summary: "Found one safe automation slice."
      evidence:
        - package.json
  - id: T002
    type: worker
    assignee: Worker
    status: queued
    objective: "Implement the first safe automation slice."
    allowed_files:
      - package.json
    verify:
      - npm test
    stop_if:
      - "Verification fails twice."
    receipt: null
  - id: T999
    type: judge
    assignee: Judge
    status: done
    objective: "Audit tranche completion."
    receipt:
      result: done
      decision: complete
      summary: "Incorrectly claimed complete despite queued Worker."
checks:
  dirty_fingerprint: clean
  last_verification:
    result: pass
    task: T999
    commands:
      - cmd: npm test
        status: pass
`);
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout.errors.join("\n"), /done goals must not leave queued or active Worker tasks: T002/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects continuous done goal without full outcome audit", () => {
  const root = makeRoot();
  try {
    writeState(root, `
version: 2
goal:
  title: "Build autonomous backend"
  slug: "build-autonomous-backend"
  kind: open_ended
  tranche: "continuous backend automation"
  status: done
rules:
  pm_owns_state: true
  one_active_task: true
  max_write_workers: 1
  no_implementation_without_worker_or_pm_task: true
  no_completion_without_judge_or_pm_audit: true
  continuous_until_full_outcome: true
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: null
tasks:
  - id: T001
    type: worker
    assignee: Worker
    status: done
    objective: "Implement the first safe backend slice."
    allowed_files:
      - package.json
    verify:
      - npm test
    stop_if:
      - "Verification fails twice."
    receipt:
      result: done
      changed_files:
        - package.json
      commands:
        - cmd: npm test
          status: pass
      summary: "One slice completed."
  - id: T999
    type: judge
    assignee: Judge
    status: done
    objective: "Audit slice completion."
    receipt:
      result: done
      decision: complete
      summary: "Current slice complete, but full outcome was not declared complete."
checks:
  dirty_fingerprint: clean
  last_verification:
    result: pass
    task: T001
    commands:
      - cmd: npm test
        status: pass
`);
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout.errors.join("\n"), /full_outcome_complete: true/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("accepts continuous done goal with full outcome audit", () => {
  const root = makeRoot();
  try {
    writeState(root, `
version: 2
goal:
  title: "Build autonomous backend"
  slug: "build-autonomous-backend"
  kind: open_ended
  tranche: "continuous backend automation"
  status: done
rules:
  pm_owns_state: true
  one_active_task: true
  max_write_workers: 1
  no_implementation_without_worker_or_pm_task: true
  no_completion_without_judge_or_pm_audit: true
  continuous_until_full_outcome: true
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: null
tasks:
  - id: T001
    type: worker
    assignee: Worker
    status: done
    objective: "Implement the complete backend automation outcome."
    allowed_files:
      - package.json
    verify:
      - npm test
    stop_if:
      - "Verification fails twice."
    receipt:
      result: done
      changed_files:
        - package.json
      commands:
        - cmd: npm test
          status: pass
      summary: "Full outcome completed."
  - id: T999
    type: judge
    assignee: Judge
    status: done
    objective: "Audit full outcome completion."
    receipt:
      result: done
      decision: complete
      full_outcome_complete: true
      summary: "Full original outcome complete."
checks:
  dirty_fingerprint: clean
  last_verification:
    result: pass
    task: T001
    commands:
      - cmd: npm test
        status: pass
`);
    const result = runChecker(root);
    assert.equal(result.status, 0, result.stderr || JSON.stringify(result.stdout));
    assert.equal(result.stdout.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects blocked continuous goal when missing input should not stop the goal", () => {
  const root = makeRoot();
  try {
    writeState(root, `
version: 2
goal:
  title: "Build autonomous backend"
  slug: "build-autonomous-backend"
  kind: open_ended
  tranche: "continuous backend automation"
  status: blocked
rules:
  pm_owns_state: true
  one_active_task: true
  max_write_workers: 1
  no_implementation_without_worker_or_pm_task: true
  no_completion_without_judge_or_pm_audit: true
  continuous_until_full_outcome: true
  missing_input_or_credentials_do_not_stop_goal: true
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: T002
tasks:
  - id: T001
    type: worker
    assignee: Worker
    status: blocked
    objective: "Run credentialed backend execute slice."
    allowed_files:
      - package.json
    verify:
      - npm test
    stop_if:
      - "Need credentials."
    receipt:
      result: blocked
      changed_files:
        - package.json
      commands:
        - cmd: npm test
          status: pass
      summary: "Blocked on credentials."
  - id: T002
    type: worker
    assignee: Worker
    status: active
    objective: "Implement safe local workaround while credentials are missing."
    allowed_files:
      - package.json
    verify:
      - npm test
    stop_if:
      - "Verification fails twice."
    receipt: null
checks:
  dirty_fingerprint: dirty
  last_verification:
    result: pass
    task: T001
    commands:
      - cmd: npm test
        status: pass
`);
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout.errors.join("\n"), /missing input or credentials should block specific tasks/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
