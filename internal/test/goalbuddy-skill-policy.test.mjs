import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const canonicalSkill = readFileSync("goalbuddy/SKILL.md", "utf8");
const pluginSkill = readFileSync("plugins/goalbuddy/skills/goalbuddy/SKILL.md", "utf8");

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
  }
});

test("Goal Maker compatibility alias inherits the same prepare-only boundary", () => {
  const codexHome = mkdtempSync(join(tmpdir(), "goalbuddy-policy-"));
  try {
    const install = spawnSync(process.execPath, [
      "internal/cli/goal-maker.mjs",
      "install",
      "--codex-home",
      codexHome,
      "--json",
    ], {
      encoding: "utf8",
    });
    assert.equal(install.status, 0, install.stderr);
    const compatibilitySkill = readFileSync(join(codexHome, "skills", "goal-maker", "SKILL.md"), "utf8");
    assert.match(compatibilitySkill, /name: goal-maker/);
    assert.match(compatibilitySkill, /This alias has the same invocation boundary as `\$goal-prep`: prepare the board only/);
    assert.match(compatibilitySkill, /Do not use or refresh named skills, inspect implementation files, browse references, research, generate assets, or perform the requested work/);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});
