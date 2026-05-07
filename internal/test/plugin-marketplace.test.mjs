import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const marketplace = JSON.parse(readFileSync(".agents/plugins/marketplace.json", "utf8"));
const plugin = JSON.parse(readFileSync("plugins/goalbuddy/.codex-plugin/plugin.json", "utf8"));

test("GoalBuddy plugin is exposed through a Codex marketplace manifest", () => {
  assert.equal(marketplace.name, "goalbuddy");
  assert.equal(marketplace.interface.displayName, "GoalBuddy");
  assert.equal(marketplace.plugins.length, 1);

  const [entry] = marketplace.plugins;
  assert.equal(entry.name, "goalbuddy");
  assert.equal(entry.source.source, "local");
  assert.equal(entry.source.path, "./plugins/goalbuddy");
  assert.equal(entry.policy.installation, "INSTALLED_BY_DEFAULT");
  assert.equal(entry.category, "Coding");
});

test("GoalBuddy plugin metadata tracks the package release", () => {
  assert.equal(plugin.name, pkg.name);
  assert.equal(plugin.version, pkg.version);
  assert.equal(plugin.repository, "https://github.com/tolibear/goalbuddy");
  assert.equal(plugin.skills, "./skills/");
});

test("GoalBuddy plugin delegates composer invocation to the skill", () => {
  assert.equal(Object.hasOwn(plugin.interface, "defaultPrompt"), false);
});
