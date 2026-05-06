import { chmodSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

const cli = resolve("internal/cli/goal-maker.mjs");

function runGoalMaker(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: options.env || process.env,
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function fakeCodexBin(root, { loggedIn = true, goalsEnabled = true } = {}) {
  const bin = join(root, "bin");
  mkdirSync(bin, { recursive: true });
  const script = [
    "#!/bin/sh",
    "if [ \"$1\" = \"--version\" ]; then echo \"codex-cli 0.128.0\"; exit 0; fi",
    "if [ \"$1\" = \"login\" ] && [ \"$2\" = \"status\" ]; then",
    loggedIn ? "  echo \"Logged in with ChatGPT\"; exit 0" : "  echo \"Not logged in\"; exit 1",
    "fi",
    "if [ \"$1\" = \"features\" ] && [ \"$2\" = \"list\" ]; then",
    `  echo "goals                               under development  ${goalsEnabled ? "true" : "false"}"; exit 0`,
    "fi",
    "exit 2",
    "",
  ].join("\n");
  const path = join(bin, "codex");
  writeFileSync(path, script);
  chmodSync(path, 0o755);
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
    assert.match(list.stdout, /kind: publish \| activation: publish_handoff/);
    assert.match(list.stdout, /state: available \| configured: no/);
    assert.match(list.stdout, /safe by default: no \| requires approval: yes/);
    assert.match(list.stdout, /missing env: GITHUB_TOKEN/);
    assert.match(list.stdout, /npx goal-maker extend install --all/);
    assert.match(list.stdout, /npx goal-maker extend publish-github-projects/);
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
    assert.match(details.stdout, /Auth env:/);
    assert.match(details.stdout, /Supports:/);
    assert.match(details.stdout, /Local use prompt:/);
    assert.match(details.stdout, /npx goal-maker extend install publish-github-projects/);
    assert.match(details.stdout, /npx goal-maker extend install publish-github-projects --dry-run/);
    assert.doesNotMatch(details.stdout, /files:/);

    const missing = runGoalMaker(["extend", "missing-extension", "--catalog-url", catalogPath, "--codex-home", codexHome]);
    assert.equal(missing.status, 1, missing.stderr || missing.stdout);
    assert.match(missing.stderr, /Extension not found: missing-extension/);
    assert.match(missing.stderr, /Available extensions:/);
    assert.match(missing.stderr, /publish-github-projects/);
    assert.match(missing.stderr, /npx goal-maker extend/);
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

test("install reports extension discovery in json mode", () => {
  const root = mkdtempSync(join(tmpdir(), "goal-maker-cli-test-"));
  try {
    const catalogPath = writeCatalog(root);
    const codexHome = join(root, "codex-home");
    const result = runGoalMaker(["install", "--codex-home", codexHome, "--catalog-url", catalogPath, "--json"]);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.command, "install");
    assert.equal(report.skill.status, "installed");
    assert.equal(report.extensions.available_count, 1);
    assert.equal(report.extensions.available[0].id, "publish-github-projects");
    assert.equal(report.extensions.recommended.length, 0);
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
