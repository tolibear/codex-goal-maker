#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "goal-maker.mjs");
const globalInstall = process.env.npm_config_global === "true"
  || process.env.npm_config_location === "global";

if (!globalInstall || process.env.GOALBUDDY_SKIP_POSTINSTALL) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [cliPath, "plugin", "install"], {
  encoding: "utf8",
  env: process.env,
  stdio: "inherit",
});

if (result.status === 0) {
  process.exit(0);
}

console.error("");
console.error("GoalBuddy installed globally, but Codex plugin setup did not complete.");
console.error("Run this after Codex is available:");
console.error("  goalbuddy");
process.exit(0);
