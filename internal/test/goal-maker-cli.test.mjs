import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

const cli = resolve("internal/cli/goal-maker.mjs");
const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version;

function runGoalMaker(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: testEnv(options.env || process.env),
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function testEnv(env) {
  const result = { ...env };
  delete result.GITHUB_TOKEN;
  return result;
}

function pathSuffixPattern(...segments) {
  return new RegExp(`${segments.map(escapeRegExp).join("[\\\\/]")}$`);
}

function escapeRegExp(value) {
  return String(value).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function fakeCodexBin(root, { loggedIn = true, goalsEnabled = true } = {}) {
  const bin = join(root, "bin");
  mkdirSync(bin, { recursive: true });
  if (process.platform === "win32") {
    const script = [
      "@echo off",
      "if \"%~1\"==\"--version\" echo codex-cli 0.128.0& exit /b 0",
      "if \"%~1\"==\"login\" if \"%~2\"==\"status\" (",
      loggedIn ? "  echo Logged in with ChatGPT& exit /b 0" : "  echo Not logged in& exit /b 1",
      ")",
      "if \"%~1\"==\"features\" if \"%~2\"==\"list\" (",
      `  echo goals                               under development  ${goalsEnabled ? "true" : "false"}& exit /b 0`,
      ")",
      "if \"%~1\"==\"plugin\" if \"%~2\"==\"marketplace\" if \"%~3\"==\"add\" echo Added marketplace goalbuddy& exit /b 0",
      "exit /b 2",
      "",
    ].join("\r\n");
    writeFileSync(join(bin, "codex.cmd"), script);
  } else {
    const script = [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then echo \"codex-cli 0.128.0\"; exit 0; fi",
      "if [ \"$1\" = \"login\" ] && [ \"$2\" = \"status\" ]; then",
      loggedIn ? "  echo \"Logged in with ChatGPT\"; exit 0" : "  echo \"Not logged in\"; exit 1",
      "fi",
      "if [ \"$1\" = \"features\" ] && [ \"$2\" = \"list\" ]; then",
      `  echo "goals                               under development  ${goalsEnabled ? "true" : "false"}"; exit 0`,
      "fi",
      "if [ \"$1\" = \"plugin\" ] && [ \"$2\" = \"marketplace\" ] && [ \"$3\" = \"add\" ]; then",
      "  echo \"Added marketplace goalbuddy\"; exit 0",
      "fi",
      "exit 2",
      "",
    ].join("\n");
    const path = join(bin, "codex");
    writeFileSync(path, script);
    chmodSync(path, 0o755);
  }
  return bin;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function writeCatalog(root) {
  const extensionRoot = join(root, "publish-github-projects");
  mkdirSync(extensionRoot, { recursive: true });
  const manifest = [
    "id: publish-github-projects",
    "kind: publish",
    "source_of_truth: local",
    "",
  ].join("\n");
  const readme = "# GitHub Projects publishing\n";
  writeFileSync(join(extensionRoot, "extension.yaml"), manifest);
  writeFileSync(join(extensionRoot, "README.md"), readme);
  const catalog = {
    extensions: [
      {
        id: "publish-github-projects",
        name: "GitHub Projects publishing",
        kind: "publish",
        version: "0.1.0",
        summary: "Publish a one-way Goal Maker board view to GitHub Projects.",
        local_use_prompt: "Run the bundled sync script. Do not use Computer Use.",
        docs: "README.md",
        use_when: [
          "The goal needs a generated GitHub Projects board view.",
        ],
        activation: "publish_handoff",
        outputs: ["GitHub Projects board view"],
        requires_approval: true,
        safe_by_default: false,
        auth: {
          env: ["GITHUB_TOKEN"],
        },
        supports: {
          dry_run: true,
          watch: true,
        },
        agent_instructions: [
          "Use the bundled sync script.",
          "Do not use Computer Use or the GitHub web UI.",
        ],
        source_of_truth: "local",
        files: [
          {
            path: "extension.yaml",
            url: "publish-github-projects/extension.yaml",
            sha256: sha256(manifest),
          },
          {
            path: "README.md",
            url: "publish-github-projects/README.md",
            sha256: sha256(readme),
          },
        ],
      },
    ],
  };
  const catalogPath = join(root, "catalog.json");
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  return catalogPath;
}

test("doctor fails when a required bundled agent is missing", () => {
  const codexHome = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const install = runGoalMaker(["install", "--codex-home", codexHome]);
    assert.equal(install.status, 0, install.stderr || install.stdout);

    unlinkSync(join(codexHome, "agents", "goal_worker.toml"));

    const doctor = runGoalMaker(["doctor", "--codex-home", codexHome]);
    assert.equal(doctor.status, 1, doctor.stderr || doctor.stdout);

    const report = JSON.parse(doctor.stdout);
    assert.equal(report.skill_installed, true);
    assert.equal(report.compatibility_skill_installed, true);
    assert.match(report.skill_path, pathSuffixPattern("skills", "goalbuddy", "SKILL.md"));
    assert.match(report.compatibility_skill_path, pathSuffixPattern("skills", "goal-maker", "SKILL.md"));
    assert.deepEqual(report.missing_agents, ["goal_worker.toml"]);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test("doctor fails when a bundled agent is stale and update refreshes it", () => {
  const codexHome = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const install = runGoalMaker(["install", "--codex-home", codexHome]);
    assert.equal(install.status, 0, install.stderr || install.stdout);

    writeFileSync(join(codexHome, "agents", "goal_worker.toml"), "stale\n");

    const staleDoctor = runGoalMaker(["doctor", "--codex-home", codexHome]);
    assert.equal(staleDoctor.status, 1, staleDoctor.stderr || staleDoctor.stdout);
    assert.deepEqual(JSON.parse(staleDoctor.stdout).stale_agents, ["goal_worker.toml"]);

    const update = runGoalMaker(["update", "--codex-home", codexHome]);
    assert.equal(update.status, 0, update.stderr || update.stdout);

    const refreshedDoctor = runGoalMaker(["doctor", "--codex-home", codexHome]);
    assert.equal(refreshedDoctor.status, 0, refreshedDoctor.stderr || refreshedDoctor.stdout);
    assert.deepEqual(JSON.parse(refreshedDoctor.stdout).stale_agents, []);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test("doctor reports native goal runtime readiness and supports strict goal-ready mode", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const fakeBin = fakeCodexBin(root, { loggedIn: false, goalsEnabled: false });
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const install = runGoalMaker(["install", "--codex-home", codexHome], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const doctor = runGoalMaker(["doctor", "--codex-home", codexHome], { env });
    assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
    const report = JSON.parse(doctor.stdout);
    assert.equal(report.goal_runtime.codex_cli_available, true);
    assert.equal(report.goal_runtime.logged_in, false);
    assert.equal(report.goal_runtime.goals_feature_enabled, false);
    assert.equal(report.goal_runtime.ready, false);

    const strictDoctor = runGoalMaker(["doctor", "--goal-ready", "--codex-home", codexHome], { env });
    assert.equal(strictDoctor.status, 1, strictDoctor.stderr || strictDoctor.stdout);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("bundled agent contracts stay strict and receipt-shaped", () => {
  const scout = readFileSync("goalbuddy/agents/goal_scout.toml", "utf8");
  const judge = readFileSync("goalbuddy/agents/goal_judge.toml", "utf8");
  const worker = readFileSync("goalbuddy/agents/goal_worker.toml", "utf8");
  assert.match(scout, /model_reasoning_effort = "low"/);
  assert.match(scout, /Read only/);
  assert.match(scout, /goalbuddy_receipt_v1/);
  assert.match(judge, /Parallel Worker work is safe only with provably disjoint allowed_files/);
  assert.match(judge, /Routine checks belong to the checker/);
  assert.match(worker, /Edit only files matching allowed_files/);
  assert.match(worker, /verification_attempts/);

  assert.equal(readFileSync("plugins/goalbuddy/skills/goalbuddy/agents/goal_scout.toml", "utf8"), scout);
  assert.equal(readFileSync("plugins/goalbuddy/skills/goalbuddy/agents/goal_judge.toml", "utf8"), judge);
  assert.equal(readFileSync("plugins/goalbuddy/skills/goalbuddy/agents/goal_worker.toml", "utf8"), worker);
});

test("install bundles core visual board backends into the skill", () => {
  const codexHome = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const install = runGoalMaker(["install", "--codex-home", codexHome, "--json"]);
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const skillRoot = join(codexHome, "skills", "goalbuddy");
    assert.equal(existsSync(join(skillRoot, "extend", "local-goal-board", "scripts", "local-goal-board.mjs")), true);
    assert.equal(existsSync(join(skillRoot, "extend", "github-projects", "scripts", "sync-github-project.mjs")), true);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test("check-update reports newer published GoalBuddy versions", () => {
  const env = {
    ...process.env,
    GOALBUDDY_TEST_NPM_LATEST_VERSION: "99.0.0",
  };

  const result = runGoalMaker(["check-update", "--json"], { env });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.current_version, packageVersion);
  assert.equal(report.latest_version, "99.0.0");
  assert.equal(report.update_available, true);
  assert.equal(report.update_command, "npx goalbuddy");

  const human = runGoalMaker(["check-update"], { env });
  assert.equal(human.status, 0, human.stderr || human.stdout);
  assert.match(human.stdout, /GoalBuddy 99\.0\.0 is available/);
  assert.match(human.stdout, /Update with: npx goalbuddy/);
});

test("prompt renders a compact active task prompt without dumping full state", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const goal = join(root, "goal");
    mkdirSync(goal, { recursive: true });
    writeFileSync(join(goal, "state.yaml"), `version: 2
goal:
  title: "Prompt test"
  slug: "prompt-test"
  kind: specific
  tranche: "Render a prompt."
  status: active
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: T002
tasks:
  - id: T001
    type: scout
    assignee: Scout
    status: done
    objective: "Old work."
    receipt:
      result: done
      summary: "A previous finding that should not force a full state dump."
      evidence:
        - README.md
  - id: T002
    type: worker
    assignee: Worker
    status: active
    objective: "Patch the prompt renderer."
    allowed_files:
      - goalbuddy/scripts/**
    verify:
      - npm test
    stop_if:
      - "Need files outside allowed_files."
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`);

    const result = runGoalMaker(["prompt", goal, "--json"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.metadata.recommended_agent, "goal_worker");
    assert.equal(report.metadata.required_spawn_agent_type, "goal_worker");
    assert.equal(report.metadata.sandbox, "workspace-write");
    assert.equal(report.task.id, "T002");
    assert.deepEqual(report.task.allowed_files, ["goalbuddy/scripts/**"]);
    assert.equal(result.stdout.includes("A previous finding that should not force a full state dump."), false);

    const human = runGoalMaker(["prompt", goal]);
    assert.equal(human.status, 0, human.stderr || human.stdout);
    assert.match(human.stdout, /Codex spawn_agent agent_type: goal_worker/);
    assert.match(human.stdout, /Do not substitute generic scout, worker, or judge agents/);
    assert.match(human.stdout, /After one wait_agent timeout/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("parallel-plan allows read-only active tasks and does not mutate state", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const goal = join(root, "goal");
    const child = join(goal, "subgoals", "T001-child");
    mkdirSync(child, { recursive: true });
    writeFileSync(join(child, "state.yaml"), `version: 2
goal:
  title: "Child"
  slug: "child"
  kind: specific
  tranche: "Judge child."
  status: active
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: T010
tasks:
  - id: T010
    type: judge
    assignee: Judge
    status: active
    objective: "Judge child evidence."
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`);
    const parentState = `version: 2
goal:
  title: "Parent"
  slug: "parent"
  kind: specific
  tranche: "Scout parent."
  status: active
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
    objective: "Scout parent evidence."
    subgoal:
      status: active
      path: subgoals/T001-child/state.yaml
      owner: Judge
      depth: 1
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`;
    writeFileSync(join(goal, "state.yaml"), parentState);

    const result = runGoalMaker(["parallel-plan", goal, "--json"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.mutated, false);
    assert.equal(report.spawned_agents, false);
    assert.equal(report.candidates.length, 2);
    assert.equal(report.candidates.every((candidate) => candidate.safe_to_parallelize), true);
    assert.equal(readFileSync(join(goal, "state.yaml"), "utf8"), parentState);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("parallel-plan rejects overlapping active Worker write scopes", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const goal = join(root, "goal");
    const child = join(goal, "subgoals", "T001-child");
    mkdirSync(child, { recursive: true });
    writeFileSync(join(child, "state.yaml"), `version: 2
goal:
  title: "Child"
  slug: "child"
  kind: specific
  tranche: "Patch child."
  status: active
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: T010
tasks:
  - id: T010
    type: worker
    assignee: Worker
    status: active
    objective: "Patch same area."
    allowed_files:
      - src/router.ts
    verify:
      - npm test
    stop_if:
      - "Need files outside allowed_files."
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`);
    writeFileSync(join(goal, "state.yaml"), `version: 2
goal:
  title: "Parent"
  slug: "parent"
  kind: specific
  tranche: "Patch parent."
  status: active
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: T001
tasks:
  - id: T001
    type: worker
    assignee: Worker
    status: active
    objective: "Patch broad area."
    allowed_files:
      - src/**
    verify:
      - npm test
    stop_if:
      - "Need files outside allowed_files."
    subgoal:
      status: active
      path: subgoals/T001-child/state.yaml
      owner: Worker
      depth: 1
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`);

    const result = runGoalMaker(["parallel-plan", goal, "--json"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.candidates.length, 2);
    assert.equal(report.candidates.every((candidate) => candidate.safe_to_parallelize === false), true);
    assert.match(report.candidates[0].reason, /overlaps|cannot be compared/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("parallel-plan treats overlapping Worker glob patterns as unsafe", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const goal = join(root, "goal");
    const child = join(goal, "subgoals", "T001-child");
    mkdirSync(child, { recursive: true });
    writeFileSync(join(child, "state.yaml"), `version: 2
goal:
  title: "Child"
  slug: "child"
  kind: specific
  tranche: "Patch child."
  status: active
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: T010
tasks:
  - id: T010
    type: worker
    assignee: Worker
    status: active
    objective: "Patch possible TypeScript peer."
    allowed_files:
      - src/foo.*
    verify:
      - npm test
    stop_if:
      - "Need files outside allowed_files."
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`);
    writeFileSync(join(goal, "state.yaml"), `version: 2
goal:
  title: "Parent"
  slug: "parent"
  kind: specific
  tranche: "Patch parent."
  status: active
agents:
  scout: installed
  worker: installed
  judge: installed
active_task: T001
tasks:
  - id: T001
    type: worker
    assignee: Worker
    status: active
    objective: "Patch TypeScript files."
    allowed_files:
      - src/*.ts
    verify:
      - npm test
    stop_if:
      - "Need files outside allowed_files."
    subgoal:
      status: active
      path: subgoals/T001-child/state.yaml
      owner: Worker
      depth: 1
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`);

    const result = runGoalMaker(["parallel-plan", goal, "--json"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.candidates.length, 2);
    assert.equal(report.candidates.every((candidate) => candidate.safe_to_parallelize === false), true);
    assert.match(report.candidates[0].reason, /overlaps|cannot be compared/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin install adds marketplace, caches plugin, and enables config", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const install = runGoalMaker(["plugin", "install", "--codex-home", codexHome, "--json"], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const report = JSON.parse(install.stdout);
    assert.equal(report.installed, true);
    assert.equal(report.plugin, "goalbuddy@goalbuddy");
    assert.equal(report.version, packageVersion);
    assert.match(report.cache_path, pathSuffixPattern("plugins", "cache", "goalbuddy", "goalbuddy", packageVersion));
    assert.match(report.config_path, /config\.toml$/);
    assert.equal(existsSync(join(report.cache_path, "skills", "goalbuddy", "extend", "local-goal-board", "scripts", "local-goal-board.mjs")), true);
    assert.equal(existsSync(join(report.cache_path, "skills", "goalbuddy", "extend", "github-projects", "scripts", "sync-github-project.mjs")), true);

    const config = readFileSync(join(codexHome, "config.toml"), "utf8");
    assert.match(config, /\[plugins\."goalbuddy@goalbuddy"\]/);
    assert.match(config, /enabled = true/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin install removes stale personal Codex GoalBuddy skills", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const staleSkill = join(codexHome, "skills", "goalbuddy");
    const staleAlias = join(codexHome, "skills", "goal-maker");
    const staleExtension = join(staleSkill, "extend", "legacy-only");
    mkdirSync(staleExtension, { recursive: true });
    mkdirSync(staleAlias, { recursive: true });
    writeFileSync(join(staleSkill, "SKILL.md"), "stale GoalBuddy skill\n");
    writeFileSync(join(staleAlias, "SKILL.md"), "stale Goal Maker alias\n");
    writeFileSync(join(staleExtension, "README.md"), "# Legacy extension\n");

    const install = runGoalMaker(["plugin", "install", "--codex-home", codexHome, "--json"], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const report = JSON.parse(install.stdout);
    assert.deepEqual(report.preserved_extensions, ["legacy-only"]);
    assert.match(report.removed_legacy_skill_paths[0], pathSuffixPattern("skills", "goalbuddy"));
    assert.match(report.removed_legacy_skill_paths[1], pathSuffixPattern("skills", "goal-maker"));
    assert.equal(existsSync(staleSkill), false);
    assert.equal(existsSync(staleAlias), false);
    assert.equal(existsSync(join(report.cache_path, "skills", "goalbuddy", "extend", "legacy-only", "README.md")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin install ignores non-version cache directories", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const install = runGoalMaker(["plugin", "install", "--codex-home", codexHome, "--json"], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const stalePreservePath = join(codexHome, "plugins", "cache", "goalbuddy", "goalbuddy", ".goalbuddy-preserved-extend-123-456");
    mkdirSync(stalePreservePath, { recursive: true });

    const reinstall = runGoalMaker(["plugin", "install", "--codex-home", codexHome, "--json"], { env });
    assert.equal(reinstall.status, 0, reinstall.stderr || reinstall.stdout);
    assert.equal(JSON.parse(reinstall.stdout).version, packageVersion);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin reinstall does not leave empty preserved cache directories", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const install = runGoalMaker(["plugin", "install", "--codex-home", codexHome, "--json"], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const reinstall = runGoalMaker(["plugin", "install", "--codex-home", codexHome, "--json"], { env });
    assert.equal(reinstall.status, 0, reinstall.stderr || reinstall.stdout);

    const cacheRoot = join(codexHome, "plugins", "cache", "goalbuddy", "goalbuddy");
    const preservedDirs = readdirSync(cacheRoot).filter((entry) => entry.startsWith(".goalbuddy-preserved-"));
    assert.deepEqual(preservedDirs, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin install output points to Goal Prep and bundled visual boards", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const install = runGoalMaker(["plugin", "install", "--codex-home", codexHome], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);
    assert.match(install.stdout, /\$goal-prep/);
    assert.match(install.stdout, /Bundled visual boards/);
    assert.match(install.stdout, /npx goalbuddy board docs\/goals\/<slug>/);
    assert.match(install.stdout, /npx goalbuddy extend github-projects/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("default command installs the native Codex plugin", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const install = runGoalMaker(["--codex-home", codexHome, "--json"], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const report = JSON.parse(install.stdout);
    assert.equal(report.installed, true);
    assert.equal(report.plugin, "goalbuddy@goalbuddy");

    const config = readFileSync(join(codexHome, "config.toml"), "utf8");
    assert.match(config, /\[plugins\."goalbuddy@goalbuddy"\]/);
    assert.match(config, /enabled = true/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("default command installs Codex and Claude Code when both homes are provided", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const claudeHome = join(root, "claude-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const install = runGoalMaker(["--codex-home", codexHome, "--claude-home", claudeHome, "--json"], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const report = JSON.parse(install.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.codex.installed, true);
    assert.equal(report.claude.skill.status, "installed");
    assert.equal(existsSync(join(codexHome, "config.toml")), true);
    assert.equal(existsSync(join(claudeHome, "skills", "goalbuddy", "SKILL.md")), true);
    assert.equal(existsSync(join(claudeHome, "agents", "goal-worker.md")), true);
    assert.equal(existsSync(join(claudeHome, "commands", "goal-prep.md")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("install removes a pre-existing legacy ~/.claude/commands/goal-prep.md", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const claudeHome = join(root, "claude-home");
    const legacyCommand = join(claudeHome, "commands", "goal-prep.md");
    mkdirSync(join(claudeHome, "commands"), { recursive: true });
    writeFileSync(legacyCommand, "stale wrapper from older GoalBuddy install\n");

    const install = runGoalMaker(["install", "--target", "claude", "--claude-home", claudeHome, "--json"]);
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const report = JSON.parse(install.stdout);
    assert.equal(report.legacy_commands_cleanup.removed, true);
    assert.equal(existsSync(legacyCommand), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("update refreshes Codex plugin and Claude Code install together", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");
    const claudeHome = join(root, "claude-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const install = runGoalMaker(["--codex-home", codexHome, "--claude-home", claudeHome, "--catalog-url", catalogPath, "--json"], { env });
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const installExtension = runGoalMaker(["extend", "install", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"], { env });
    assert.equal(installExtension.status, 0, installExtension.stderr || installExtension.stdout);

    writeFileSync(join(claudeHome, "agents", "goal-worker.md"), "stale\n");

    const update = runGoalMaker(["update", "--codex-home", codexHome, "--claude-home", claudeHome, "--catalog-url", catalogPath, "--json"], { env });
    assert.equal(update.status, 0, update.stderr || update.stdout);
    const report = JSON.parse(update.stdout);
    assert.equal(report.ok, true);
    assert.deepEqual(report.codex.preserved_extensions, ["publish-github-projects"]);
    assert.equal(report.claude.agents.find((agent) => agent.file === "goal-worker.md").status, "updated");

    const details = runGoalMaker(["extend", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"], { env });
    assert.equal(details.status, 0, details.stderr || details.stdout);
    assert.equal(JSON.parse(details.stdout).extension.state.installed, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extend shows catalog entries and reports local install state", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");
    const result = runGoalMaker(["extend", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.extensions[0].id, "publish-github-projects");
    assert.deepEqual(report.extensions[0].use_when, ["The goal needs a generated GitHub Projects board view."]);
    assert.equal(report.extensions[0].activation, "publish_handoff");
    assert.deepEqual(report.extensions[0].outputs, ["GitHub Projects board view"]);
    assert.equal(report.extensions[0].requires_approval, true);
    assert.equal(report.extensions[0].safe_by_default, false);
    assert.equal(report.extensions[0].state.available, true);
    assert.equal(report.extensions[0].state.installed, false);
    assert.equal(report.extensions[0].state.configured, false);
    assert.deepEqual(report.extensions[0].state.missing_env, ["GITHUB_TOKEN"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extend human output shows extension names, descriptions, and next commands", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");

    const list = runGoalMaker(["extend", "--catalog-url", catalogPath, "--codex-home", codexHome]);
    assert.equal(list.status, 0, list.stderr || list.stdout);
    assert.match(list.stdout, /Available extensions/);
    assert.match(list.stdout, /GitHub Projects publishing/);
    assert.match(list.stdout, /Publish a one-way Goal Maker board view to GitHub Projects\./);
    assert.doesNotMatch(list.stdout, /kind: publish \| activation: publish_handoff/);
    assert.doesNotMatch(list.stdout, /state: available \| configured: no/);
    assert.doesNotMatch(list.stdout, /safe by default: no \| requires approval: yes/);
    assert.doesNotMatch(list.stdout, /missing env: GITHUB_TOKEN/);
    assert.match(list.stdout, /npx goalbuddy extend install --all/);
    assert.match(list.stdout, /npx goalbuddy extend publish-github-projects/);
    assert.doesNotMatch(list.stdout, /publish-github-projects\tpublish/);

    const details = runGoalMaker(["extend", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome]);
    assert.equal(details.status, 0, details.stderr || details.stdout);
    assert.match(details.stdout, /Status: available/);
    assert.match(details.stdout, /Configured: no/);
    assert.match(details.stdout, /ID: publish-github-projects/);
    assert.match(details.stdout, /Kind: publish/);
    assert.match(details.stdout, /Version: 0\.1\.0/);
    assert.match(details.stdout, /Activation: publish_handoff/);
    assert.match(details.stdout, /Safe by default: no/);
    assert.match(details.stdout, /Requires approval: yes/);
    assert.match(details.stdout, /Use when:/);
    assert.match(details.stdout, /Outputs:/);
    assert.match(details.stdout, /Agent instructions:/);
    assert.match(details.stdout, /Do not use Computer Use or the GitHub web UI/);
    assert.match(details.stdout, /Auth env:/);
    assert.match(details.stdout, /Supports:/);
    assert.match(details.stdout, /Local use prompt:/);
    assert.match(details.stdout, /Run the bundled sync script\. Do not use Computer Use\./);
    assert.match(details.stdout, /npx goalbuddy extend install publish-github-projects/);
    assert.match(details.stdout, /npx goalbuddy extend install publish-github-projects --dry-run/);
    assert.doesNotMatch(details.stdout, /files:/);

    const missing = runGoalMaker(["extend", "missing-extension", "--catalog-url", catalogPath, "--codex-home", codexHome]);
    assert.equal(missing.status, 1, missing.stderr || missing.stdout);
    assert.match(missing.stderr, /Extension not found: missing-extension/);
    assert.match(missing.stderr, /Available extensions:/);
    assert.match(missing.stderr, /publish-github-projects/);
    assert.match(missing.stderr, /npx goalbuddy extend/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extend installs all catalog extensions", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");

    const installCore = runGoalMaker(["install", "--codex-home", codexHome]);
    assert.equal(installCore.status, 0, installCore.stderr || installCore.stdout);

    const dryRun = runGoalMaker(["extend", "install", "--all", "--catalog-url", catalogPath, "--codex-home", codexHome, "--dry-run", "--json"]);
    assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
    const dryRunReport = JSON.parse(dryRun.stdout);
    assert.equal(dryRunReport.dry_run, true);
    assert.equal(dryRunReport.extensions.length, 1);
    assert.equal(dryRunReport.extensions[0].extension.id, "publish-github-projects");

    const install = runGoalMaker(["extend", "install", "--all", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"]);
    assert.equal(install.status, 0, install.stderr || install.stdout);
    const installReport = JSON.parse(install.stdout);
    assert.equal(installReport.installed, true);
    assert.equal(installReport.count, 1);
    assert.deepEqual(installReport.extensions.map((extension) => extension.id), ["publish-github-projects"]);

    const details = runGoalMaker(["extend", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"]);
    assert.equal(details.status, 0, details.stderr || details.stdout);
    assert.equal(JSON.parse(details.stdout).extension.state.installed, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extend installs into the plugin skill after default plugin install", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");
    const fakeBin = fakeCodexBin(root);
    const env = {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    };

    const installPlugin = runGoalMaker(["--codex-home", codexHome, "--json"], { env });
    assert.equal(installPlugin.status, 0, installPlugin.stderr || installPlugin.stdout);

    const installExtensions = runGoalMaker(["extend", "install", "--all", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"], { env });
    assert.equal(installExtensions.status, 0, installExtensions.stderr || installExtensions.stdout);

    const report = JSON.parse(installExtensions.stdout);
    assert.equal(report.installed, true);
    assert.match(report.extensions[0].target, new RegExp(`plugins[\\\\/]cache[\\\\/]goalbuddy[\\\\/]goalbuddy[\\\\/][^\\\\/]+[\\\\/]skills[\\\\/]goalbuddy[\\\\/]extend[\\\\/]publish-github-projects$`));

    const details = runGoalMaker(["extend", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"], { env });
    assert.equal(details.status, 0, details.stderr || details.stdout);
    assert.equal(JSON.parse(details.stdout).extension.state.installed, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("install reports extension discovery in json mode", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");
    const result = runGoalMaker(["install", "--codex-home", codexHome, "--catalog-url", catalogPath, "--json"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.command, "install");
    assert.equal(report.package.name, "goalbuddy");
    assert.equal(report.skill.status, "installed");
    assert.match(report.skill.path, pathSuffixPattern("skills", "goalbuddy"));
    assert.match(report.skill.compatibility_path, pathSuffixPattern("skills", "goal-maker"));
    assert.equal(report.extensions.available_count, 1);
    assert.equal(report.extensions.available[0].id, "publish-github-projects");
    assert.equal(report.extensions.recommended.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy goal-maker invocation prints rebrand notice only for human output", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const env = {
      ...process.env,
      GOALBUDDY_INVOKED_AS: "goal-maker",
    };

    const human = runGoalMaker(["--help"], { env });
    assert.equal(human.status, 0, human.stderr || human.stdout);
    assert.match(human.stdout, /GoalBuddy for Claude Code and Codex/);
    assert.match(human.stdout, /goalbuddy install/);
    assert.match(human.stderr, /goal-maker has been rebranded to goalbuddy/);
    assert.match(human.stderr, /Use: npx goalbuddy/);

    const json = runGoalMaker(["install", "--codex-home", codexHome, "--catalog-url", writeCatalog(root), "--json"], { env });
    assert.equal(json.status, 0, json.stderr || json.stdout);
    assert.equal(json.stderr, "");
    const report = JSON.parse(json.stdout);
    assert.equal(report.package.name, "goalbuddy");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("install migrates legacy skill extensions and metadata to GoalBuddy paths", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");
    const legacySkill = join(codexHome, "skills", "goal-maker");
    const legacyExtension = join(legacySkill, "extend", "legacy-only");
    mkdirSync(legacyExtension, { recursive: true });
    writeFileSync(join(legacyExtension, "README.md"), "# Legacy extension\n");
    writeFileSync(join(legacySkill, ".goal-maker-install.json"), JSON.stringify({
      package_name: "goal-maker",
      package_version: "0.2.9",
    }));

    const install = runGoalMaker(["install", "--codex-home", codexHome, "--catalog-url", catalogPath, "--json"]);
    assert.equal(install.status, 0, install.stderr || install.stdout);
    const report = JSON.parse(install.stdout);
    assert.deepEqual(report.skill.preserved_extensions, ["legacy-only"]);
    assert.equal(report.skill.previous_version, "0.2.9");

    const doctor = runGoalMaker(["doctor", "--codex-home", codexHome]);
    assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
    const doctorReport = JSON.parse(doctor.stdout);
    assert.equal(doctorReport.skill_installed, true);
    assert.equal(doctorReport.compatibility_skill_installed, true);
    assert.match(doctorReport.skill_path, pathSuffixPattern("skills", "goalbuddy", "SKILL.md"));
    assert.match(doctorReport.compatibility_skill_path, pathSuffixPattern("skills", "goal-maker", "SKILL.md"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("extend installs a catalog extension with checksum verification", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");

    const installCore = runGoalMaker(["install", "--codex-home", codexHome]);
    assert.equal(installCore.status, 0, installCore.stderr || installCore.stdout);

    const dryRun = runGoalMaker(["extend", "install", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--dry-run", "--json"]);
    assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
    assert.equal(JSON.parse(dryRun.stdout).dry_run, true);

    const install = runGoalMaker(["extend", "install", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"]);
    assert.equal(install.status, 0, install.stderr || install.stdout);

    const details = runGoalMaker(["extend", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"]);
    assert.equal(details.status, 0, details.stderr || details.stdout);
    assert.equal(JSON.parse(details.stdout).extension.state.installed, true);

    const doctor = runGoalMaker(["extend", "doctor", "publish-github-projects", "--codex-home", codexHome, "--json"]);
    assert.equal(doctor.status, 1, doctor.stderr || doctor.stdout);
    assert.deepEqual(JSON.parse(doctor.stdout).extensions[0].issues, ["missing env: GITHUB_TOKEN"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("board command installs and launches the local board extension", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const codexHome = join(root, "codex-home");
    const goalDir = join(root, "docs", "goals", "demo");
    mkdirSync(join(goalDir, "notes"), { recursive: true });
    writeFileSync(join(goalDir, "goal.md"), "# Demo\n");
    writeFileSync(join(goalDir, "state.yaml"), `
version: 2
goal:
  title: "Demo"
  slug: "demo"
  kind: specific
  tranche: "demo"
  status: active
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
    objective: "Map the demo."
    receipt: null
checks:
  dirty_fingerprint: unknown
  last_verification:
    result: unknown
    task: null
    commands: []
`);

    const installCore = runGoalMaker(["install", "--codex-home", codexHome]);
    assert.equal(installCore.status, 0, installCore.stderr || installCore.stdout);

    const board = runGoalMaker([
      "board",
      goalDir,
      "--codex-home",
      codexHome,
      "--once",
      "--json",
      "--port",
      "0",
    ]);
    assert.equal(board.status, 0, board.stderr || board.stdout);

    const report = JSON.parse(board.stdout);
    assert.equal(report.goalDir, goalDir);
    assert.equal(existsSync(join(goalDir, ".goalbuddy-board", "index.html")), true);
    assert.equal(report.board.goal.slug, "demo");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("update preserves installed extensions and reports unchanged files", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");

    const installCore = runGoalMaker(["install", "--codex-home", codexHome, "--catalog-url", catalogPath, "--json"]);
    assert.equal(installCore.status, 0, installCore.stderr || installCore.stdout);

    const installExtension = runGoalMaker(["extend", "install", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"]);
    assert.equal(installExtension.status, 0, installExtension.stderr || installExtension.stdout);

    const update = runGoalMaker(["update", "--codex-home", codexHome, "--catalog-url", catalogPath, "--json"]);
    assert.equal(update.status, 0, update.stderr || update.stdout);
    const report = JSON.parse(update.stdout);
    assert.equal(report.command, "update");
    assert.equal(report.skill.status, "unchanged");
    assert.deepEqual(report.skill.preserved_extensions, ["publish-github-projects"]);

    const details = runGoalMaker(["extend", "publish-github-projects", "--catalog-url", catalogPath, "--codex-home", codexHome, "--json"]);
    assert.equal(details.status, 0, details.stderr || details.stdout);
    assert.equal(JSON.parse(details.stdout).extension.state.installed, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
