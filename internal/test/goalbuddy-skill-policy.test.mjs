import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const canonicalSkill = readFileSync("goalbuddy/SKILL.md", "utf8");
const pluginSkill = readFileSync("plugins/goalbuddy/skills/goalbuddy/SKILL.md", "utf8");

test("GoalBuddy invocation boundary keeps $goalbuddy prepare-only", () => {
  for (const text of [canonicalSkill, pluginSkill]) {
    assert.match(text, /\$goalbuddy`: prepare intake, `goal\.md`, `state\.yaml`, and the starter `\/goal` command, then stop/);
    assert.match(text, /During a `\$goalbuddy` turn, do not perform the user's requested work/);
    assert.match(text, /Do not refresh or load named skills/);
    assert.match(text, /Do not load that skill, browse that repo, or generate those assets during `\$goalbuddy`/);
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
    assert.match(compatibilitySkill, /This alias has the same invocation boundary as `\$goalbuddy`: prepare the board only/);
    assert.match(compatibilitySkill, /Do not use or refresh named skills, inspect implementation files, browse references, research, generate assets, or perform the requested work/);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});
