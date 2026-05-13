import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const canonicalSkill = readFileSync("goal-prep/SKILL.md", "utf8");
const pluginSkill = readFileSync("plugins/goalbuddy/skills/goal-prep/SKILL.md", "utf8");
const deepIntakeSkill = readFileSync("deep-intake/SKILL.md", "utf8");
const pluginDeepIntakeSkill = readFileSync("plugins/goalbuddy/skills/deep-intake/SKILL.md", "utf8");
const aliasSkill = readFileSync("goalbuddy/SKILL.md", "utf8");
const pluginAliasSkill = readFileSync("plugins/goalbuddy/skills/goalbuddy/SKILL.md", "utf8");

function fakeCodexBin(root) {
  const bin = join(root, "bin");
  mkdirSync(bin, { recursive: true });
  const path = join(bin, "codex");
  writeFileSync(path, [
    "#!/bin/sh",
    "if [ \"$1\" = \"--version\" ]; then echo \"codex-cli 0.128.0\"; exit 0; fi",
    "if [ \"$1\" = \"login\" ] && [ \"$2\" = \"status\" ]; then echo \"Logged in with ChatGPT\"; exit 0; fi",
    "if [ \"$1\" = \"features\" ] && [ \"$2\" = \"list\" ]; then echo \"goals                               under development  true\"; exit 0; fi",
    "if [ \"$1\" = \"plugin\" ] && [ \"$2\" = \"marketplace\" ] && [ \"$3\" = \"add\" ]; then echo \"Added marketplace goalbuddy\"; exit 0; fi",
    "exit 2",
    "",
  ].join("\n"));
  chmodSync(path, 0o755);
  return bin;
}

test("Goal Prep invocation boundary keeps $goal-prep prepare-only", () => {
  for (const text of [canonicalSkill, pluginSkill]) {
    assert.match(text, /\$goal-prep`: prepare intake, `goal\.md`, `state\.yaml`, and the starter `\/goal` command, then stop/);
    assert.match(text, /During a `\$goal-prep` turn, do not perform the user's requested work/);
    assert.match(text, /Do not refresh or load named skills/);
    assert.match(text, /Do not load that skill, browse that repo, or generate those assets during `\$goal-prep`/);
    assert.match(text, /check whether GoalBuddy itself is stale/);
    assert.match(text, /GoalBuddy <latest_version> is available/);
    assert.match(text, /Do you want to set up a visual board for this\?/);
    assert.match(text, /Ask the visual-board question early/);
    assert.match(text, /start the local board before filling the task list/);
    assert.match(text, /Codex in-app Browser/);
    assert.match(text, /GitHub Projects/);
    assert.match(text, /Operator Escalation/);
    assert.match(text, /ask the operator one concise question before creating the external artifact/);
    assert.match(text, /This section applies after the user starts `\/goal Follow docs\/goals\/<slug>\/goal\.md\.`/);
    assert.doesNotMatch(text, /## Deep Intake Route/);
    assert.doesNotMatch(text, /sharpen this goal together first/);
  }
});

test("Deep Intake is a separate full GoalBuddy compiler", () => {
  for (const text of [deepIntakeSkill, pluginDeepIntakeSkill]) {
    assert.match(text, /name: deep-intake/);
    assert.match(text, /pre-alignment layer that compiles\s+through the canonical sibling `goal-prep` skill spec/);
    assert.match(text, /Canonical Compiler Source/);
    assert.match(text, /read the sibling `goal-prep\/SKILL\.md`/);
    assert.match(text, /goal-prep` wins for\s+generic GoalBuddy board behavior/);
    assert.doesNotMatch(text, /goal-brief/);
    assert.match(text, /GoalBuddy-native/);
    assert.match(text, /Do not implement the user's requested work/);
    assert.match(text, /Ask at least three material sparring\s+questions/);
    assert.match(text, /1-2 targeted file reads\s+or searches per material technical question/);
    assert.match(text, /What would disappoint you/);
    assert.match(text, /notes\/raw-input\.md/);
    assert.match(text, /notes\/discussion\.md/);
    assert.match(text, /notes\/quality\.md/);
    assert.match(text, /the first Scout, Judge, or PM validation task lists `notes\/raw-input\.md`/);
    assert.match(text, /`T999` lists those notes as inputs/);
    assert.match(text, /Compile Contract/);
    assert.match(text, /Goal Prep Compiler Source/);
    assert.match(text, /Quality Gate/);
    assert.match(text, /check-goal-state\.mjs docs\/goals\/<slug>\/state\.yaml/);
    assert.match(text, /check-deep-intake-artifacts\.mjs docs\/goals\/<slug>/);
  }
});

test("GoalBuddy compatibility alias points to canonical entry points", () => {
  for (const text of [aliasSkill, pluginAliasSkill]) {
    assert.match(text, /name: goalbuddy/);
    assert.match(text, /Compatibility Alias/);
    assert.match(text, /\$goal-prep` \/ `\/goal-prep`/);
    assert.match(text, /\$deep-intake` \/ `\/deep-intake`/);
    assert.match(text, /legacy alias/);
    assert.doesNotMatch(text, /## Update Check/);
  }
});

test("Codex install keeps Goal Prep in the plugin and removes compatibility skill folders", () => {
  const root = mkdtempSync(join(tmpdir(), "goalbuddy-policy-"));
  try {
    const codexHome = join(root, "codex-home");
    const env = {
      ...process.env,
      PATH: `${fakeCodexBin(root)}${delimiter}${process.env.PATH}`,
    };
    const install = spawnSync(process.execPath, [
      "internal/cli/goal-maker.mjs",
      "install",
      "--codex-home",
      codexHome,
      "--json",
    ], {
      encoding: "utf8",
      env,
    });
    assert.equal(install.status, 0, install.stderr);
    const report = JSON.parse(install.stdout);
    const installedPluginSkill = readFileSync(join(report.cache_path, "skills", "goal-prep", "SKILL.md"), "utf8");
    const installedDeepIntakeSkill = readFileSync(join(report.cache_path, "skills", "deep-intake", "SKILL.md"), "utf8");
    const installedAliasSkill = readFileSync(join(report.cache_path, "skills", "goalbuddy", "SKILL.md"), "utf8");
    assert.equal(existsSync(join(codexHome, "skills", "goal-maker", "SKILL.md")), false);
    assert.equal(existsSync(join(codexHome, "skills", "goalbuddy", "SKILL.md")), false);
    assert.equal(existsSync(join(codexHome, "skills", "goal-prep", "SKILL.md")), false);
    assert.match(installedPluginSkill, /During a `\$goal-prep` turn, do not perform the user's requested work/);
    assert.match(installedDeepIntakeSkill, /Deep Intake for GoalBuddy/);
    assert.match(installedAliasSkill, /Compatibility Alias/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
