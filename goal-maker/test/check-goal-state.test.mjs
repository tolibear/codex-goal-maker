import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const checker = resolve("goal-maker/scripts/check-goal-state.mjs");

function writeGoal(root, rootFile) {
  mkdirSync(join(root, "artifacts"), { recursive: true });
  writeFileSync(join(root, rootFile), "# Goal\n");
  writeFileSync(join(root, "evidence.jsonl"), "");
  writeFileSync(join(root, "state.yaml"), `
goal: "Sample"
slug: "sample"
status: done
active_unit: null
active_unit_status: none
wip_limit: 1

gate:
  status: green
  feature_work_allowed: false
  completion_allowed: true
  blocked_scope: []
  reason: "complete"
  next_action: "none"
  updated_at: "2026-05-03T00:00:00Z"

dirty:
  fingerprint: "clean"
  inside_active_scope: true
  partitioned: true

verification:
  required:
    - command: "git diff --check"
      status: pass
      fingerprint: "abc"
      summary: "pass"
`);
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

test("check-goal-state accepts goal.md and terminal null active unit", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-test-"));
  try {
    writeGoal(root, "goal.md");
    const result = runChecker(root);
    assert.equal(result.status, 0, result.stderr || JSON.stringify(result.stdout));
    assert.equal(result.stdout.ok, true);
    assert.equal(result.stdout.active_unit, null);
    assert.equal(result.stdout.active_unit_status, "none");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check-goal-state keeps README.md backward compatible", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-test-"));
  try {
    writeGoal(root, "README.md");
    const result = runChecker(root);
    assert.equal(result.status, 0, result.stderr || JSON.stringify(result.stdout));
    assert.equal(result.stdout.ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check-goal-state rejects unexpected root markdown artifacts", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-test-"));
  try {
    writeGoal(root, "goal.md");
    writeFileSync(join(root, "scout-report.md"), "# stray\n");
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stdout.errors.join("\n"), /unexpected root markdown artifacts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
