#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const target = process.argv[2];
const write = process.argv.includes("--write");

if (!target) {
  console.error("Usage: node scripts/organize-goal-artifacts.mjs docs/goals/<slug>/state.yaml [--write]");
  process.exit(2);
}

const root = basename(target) === "state.yaml" ? dirname(target) : target;

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(JSON.stringify({ ok: false, error: `goal root not found: ${root}` }, null, 2));
  process.exit(1);
}

const rootAllowlist = new Set([
  "goal.md",
  "README.md",
  "state.yaml",
  "evidence.jsonl",
  "review-bundles.md",
  "decisions.md",
  "blockers.md",
]);

const artifactDirs = [
  "artifacts/scouts",
  "artifacts/judges",
  "artifacts/audits",
  "artifacts/owner-packets",
  "artifacts/staging-slices",
  "artifacts/commit-slices",
  "artifacts/verification",
  "artifacts/completion",
  "artifacts/archive",
];

function classify(file) {
  const lower = file.toLowerCase();
  if (lower.startsWith("scout-")) return "artifacts/scouts";
  if (lower.startsWith("judge-")) return "artifacts/judges";
  if (lower.includes("audit")) return "artifacts/audits";
  if ((lower.includes("owner") && lower.includes("packet")) || lower.includes("handoff")) return "artifacts/owner-packets";
  if (lower.startsWith("staging-slice-") || lower.includes("staging-scope-proposal") || lower.includes("packaging-staging")) return "artifacts/staging-slices";
  if (lower.includes("commit-slicing") || lower.includes("commit-slice")) return "artifacts/commit-slices";
  if (lower.includes("verification")) return "artifacts/verification";
  if (lower.includes("completion") || lower.includes("gap-table")) return "artifacts/completion";
  return "artifacts/archive";
}

const moves = [];
const conflicts = [];

for (const entry of readdirSync(root)) {
  const source = join(root, entry);
  if (!statSync(source).isFile()) continue;
  if (!entry.endsWith(".md")) continue;
  if (rootAllowlist.has(entry)) continue;

  const destinationDir = classify(entry);
  const destination = join(root, destinationDir, entry);
  moves.push({ from: entry, to: `${destinationDir}/${entry}` });
  if (existsSync(destination)) conflicts.push(`${destinationDir}/${entry}`);
}

if (write && conflicts.length === 0) {
  for (const dir of artifactDirs) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  for (const move of moves) {
    renameSync(join(root, move.from), join(root, move.to));
  }
}

const result = {
  ok: conflicts.length === 0,
  mode: write ? "write" : "dry-run",
  root,
  moved: write && conflicts.length === 0 ? moves.length : 0,
  planned: moves,
  conflicts,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
