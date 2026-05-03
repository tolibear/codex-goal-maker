#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const statePath = process.argv[2];

if (!statePath) {
  console.error("Usage: node scripts/check-goal-state.mjs docs/goals/<slug>/state.yaml");
  process.exit(2);
}

if (!existsSync(statePath)) {
  console.error(JSON.stringify({ ok: false, errors: [`state file not found: ${statePath}`], warnings: [] }, null, 2));
  process.exit(1);
}

const root = dirname(statePath);
const text = readFileSync(statePath, "utf8");
const errors = [];
const warnings = [];
const rootAllowlist = new Set([
  "goal.md",
  "README.md",
  "state.yaml",
  "evidence.jsonl",
  "review-bundles.md",
  "decisions.md",
  "blockers.md",
]);
const expectedArtifactDirs = [
  "artifacts",
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

function clean(value) {
  const cleaned = value.replace(/#.*/, "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
  return cleaned === "null" ? null : cleaned;
}

function topScalar(key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  return match ? clean(match[1]) : null;
}

function nestedScalar(section, key) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  for (const line of lines) {
    if (new RegExp(`^${section}:\\s*$`).test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^\S/.test(line)) break;
    if (inSection) {
      const match = line.match(new RegExp(`^\\s{2}${key}:\\s*(.+?)\\s*$`));
      if (match) return clean(match[1]);
    }
  }
  return null;
}

const activeUnit = topScalar("active_unit");
const activeUnitStatus = topScalar("active_unit_status");
const gateStatus = nestedScalar("gate", "status");
const featureAllowed = nestedScalar("gate", "feature_work_allowed");
const blockedScopeLine = nestedScalar("gate", "blocked_scope");
const dirtyInside = nestedScalar("dirty", "inside_active_scope");
const dirtyPartitioned = nestedScalar("dirty", "partitioned");
const status = topScalar("status");
const gateStatuses = ["green", "red", "blocked"];

function blockedScopes() {
  if (!blockedScopeLine) return [];
  return blockedScopeLine
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim().replace(/^[\'\"]|[\'\"]$/g, ""))
    .filter(Boolean);
}

const scopes = blockedScopes();

function walkMarkdownFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      results.push(...walkMarkdownFiles(path));
    } else if (entry.endsWith(".md")) {
      results.push(path);
    }
  }
  return results;
}

const rootEntries = readdirSync(root).filter((entry) => entry !== ".DS_Store");
const rootMarkdownArtifacts = [];
for (const entry of rootEntries) {
  const path = join(root, entry);
  const stats = statSync(path);
  if (stats.isFile() && entry.endsWith(".md") && !rootAllowlist.has(entry)) {
    rootMarkdownArtifacts.push(entry);
  }
}
if (rootMarkdownArtifacts.length > 0) {
  errors.push(`unexpected root markdown artifacts; move under artifacts/<kind>/: ${rootMarkdownArtifacts.join(", ")}`);
}

for (const artifactDir of expectedArtifactDirs) {
  if (!existsSync(join(root, artifactDir))) {
    warnings.push(`artifact directory not found: ${artifactDir}`);
  }
}

const artifactRoot = join(root, "artifacts");
for (const artifactPath of walkMarkdownFiles(artifactRoot)) {
  const artifactText = readFileSync(artifactPath, "utf8");
  const rel = relative(root, artifactPath);
  if (!/^---\s*\n[\s\S]*?\n---\s*\n/.test(artifactText)) {
    warnings.push(`${rel} missing artifact frontmatter`);
    continue;
  }
  for (const key of ["unit", "kind", "status", "created_at", "source_evidence"]) {
    if (!new RegExp(`^${key}:`, "m").test(artifactText)) {
      warnings.push(`${rel} artifact frontmatter missing ${key}`);
    }
  }
}

if (!activeUnit && status !== "done") errors.push("missing top-level active_unit");
if (activeUnitStatus === "completed" && !scopes.includes("all_local_work") && status !== "done") {
  errors.push("active_unit_status is completed while local productive work remains; set the next active unit or add all_local_work with an exhaustion table");
}
if (!gateStatus) errors.push("missing gate.status");
if (gateStatus && !gateStatuses.includes(gateStatus)) {
  errors.push(`gate.status must be one of ${gateStatuses.join(", ")}; got ${gateStatus}`);
}
if (featureAllowed === null) errors.push("missing gate.feature_work_allowed");
if (["red", "blocked"].includes(gateStatus) && featureAllowed === "true") {
  errors.push("feature_work_allowed must be false when gate.status is red or blocked");
}
if (gateStatus === "green" && featureAllowed === "false") {
  warnings.push("gate.status is green but feature_work_allowed is false");
}
if (gateStatus === "blocked" && scopes.length === 0) {
  errors.push("gate.status blocked requires gate.blocked_scope");
}
if (gateStatus !== "blocked" && scopes.length > 0) {
  warnings.push("gate.blocked_scope is set while gate.status is not blocked");
}
if (gateStatus === "blocked" && scopes.includes("all_local_work")) {
  const hasExhaustion = /exhaustion(_|\s|-)?table:/i.test(text) || /##\s+Exhaustion Table/im.test(text);
  if (!hasExhaustion) {
    errors.push("blocked_scope includes all_local_work, so an exhaustion table is required");
  }
}
if (gateStatus === "blocked" && !scopes.includes("all_local_work")) {
  warnings.push("gate is blocked but not globally blocked; continue with local productive work outside blocked_scope");
}
if (gateStatus === "green" && dirtyInside === "false" && dirtyPartitioned !== "true") {
  errors.push("gate.status cannot be green when dirty.inside_active_scope is false unless dirty.partitioned is true");
}
if (gateStatus === "green" && /status:\s*(fail|unknown|stale|blocked)\b/.test(text)) {
  errors.push("gate.status cannot be green while any verification status is fail, unknown, stale, or blocked");
}

const unitsDir = join(root, "units");
if (activeUnit && existsSync(unitsDir)) {
  const files = walkMarkdownFiles(unitsDir);
  const activeFiles = [];
  for (const file of files) {
    const unitText = readFileSync(file, "utf8");
    if (/^Status:\s*(active|running)\b/im.test(unitText)) activeFiles.push(relative(unitsDir, file));
  }
  if (activeFiles.length > 1) errors.push(`more than one active/running unit: ${activeFiles.join(", ")}`);

  const expectedFlat = join(unitsDir, `${activeUnit}.md`);
  const expectedActive = join(unitsDir, "active", `${activeUnit}.md`);
  const expected = existsSync(expectedFlat) ? expectedFlat : expectedActive;
  if (!existsSync(expected)) {
    warnings.push(`active unit file not found at ${expectedFlat} or ${expectedActive}`);
  } else {
    const unitText = readFileSync(expected, "utf8");
    const requiredHeadings = ["Objective", "Evidence", "Allowed files", "Commands", "Stop if", "Done when"];
    for (const heading of requiredHeadings) {
      if (!new RegExp(`^##\\s+${heading}\\b`, "im").test(unitText)) {
        errors.push(`${activeUnit}.md missing heading: ## ${heading}`);
      }
    }
  }
} else if (activeUnit) {
  warnings.push(`units directory not found: ${unitsDir}`);
}

const result = {
  ok: errors.length === 0,
  state_path: statePath,
  status,
  active_unit: activeUnit,
  active_unit_status: activeUnitStatus,
  gate_status: gateStatus,
  blocked_scope: scopes,
  feature_work_allowed: featureAllowed,
  errors,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
