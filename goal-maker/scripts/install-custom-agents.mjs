#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(__dirname, "../assets/codex-agents");
const destDir = resolve(process.argv[2] || ".codex/agents");
const force = process.argv.includes("--force");

if (!existsSync(sourceDir)) {
  console.error(`custom agent assets not found: ${sourceDir}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

const files = readdirSync(sourceDir).filter((f) => f.endsWith(".toml") && !f.includes("config-snippet"));
for (const file of files) {
  const src = join(sourceDir, file);
  const dest = join(destDir, file);
  if (existsSync(dest) && !force) {
    console.log(`skip existing ${dest} (use --force to overwrite)`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`installed ${dest}`);
}
