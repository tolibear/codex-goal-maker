#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = process.argv[2];

if (!input) {
  console.error("Usage: node scripts/check-deep-intake-artifacts.mjs docs/goals/<slug>|docs/goals/<slug>/state.yaml");
  process.exit(2);
}

const target = resolve(input);
const root = existsSync(target) && statSync(target).isFile() ? dirname(target) : target;
const statePath = join(root, "state.yaml");
const goalPath = join(root, "goal.md");
const notes = {
  rawInput: join(root, "notes", "raw-input.md"),
  discussion: join(root, "notes", "discussion.md"),
  quality: join(root, "notes", "quality.md"),
};
const noteRefs = [
  "notes/raw-input.md",
  "notes/discussion.md",
  "notes/quality.md",
];

const errors = [];
const warnings = [];

function readRequired(path, label, { minLength = 1 } = {}) {
  if (!existsSync(path)) {
    errors.push(`missing ${label}: ${path}`);
    return "";
  }
  const text = readFileSync(path, "utf8").trim();
  if (text.length < minLength) errors.push(`${label} is too thin or empty: ${path}`);
  return text;
}

function sectionText(text, section) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${section}:\\s*$`).test(line));
  if (start === -1) return "";
  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\S/.test(lines[index])) break;
    collected.push(lines[index]);
  }
  return collected.join("\n");
}

function clean(value) {
  if (value === undefined || value === null) return null;
  const cleaned = value.replace(/#.*/, "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
  if (cleaned === "" || cleaned === "null") return null;
  return cleaned;
}

function taskScalar(task, key) {
  const match = task.raw.match(new RegExp(`^\\s{4}${key}:\\s*(.*?)\\s*$`, "m"));
  return match ? clean(match[1]) : null;
}

function parseTasks(stateText) {
  const body = sectionText(stateText, "tasks");
  if (!body) return [];
  const lines = body.split(/\r?\n/);
  const tasks = [];
  let current = null;
  let currentLines = [];

  function finish() {
    if (!current) return;
    current.raw = currentLines.join("\n");
    current.type = taskScalar(current, "type");
    current.status = taskScalar(current, "status");
    tasks.push(current);
  }

  for (const line of lines) {
    const idMatch = line.match(/^\s{2}-\s+id:\s*(.+?)\s*$/);
    if (idMatch) {
      finish();
      current = { id: clean(idMatch[1]) };
      currentLines = [line];
      continue;
    }
    if (current) currentLines.push(line);
  }
  finish();
  return tasks;
}

function includesAllNoteRefs(text) {
  return noteRefs.every((ref) => text.includes(ref));
}

function runBaseChecker() {
  if (!existsSync(statePath)) return;
  const checker = join(__dirname, "check-goal-state.mjs");
  if (!existsSync(checker)) {
    warnings.push(`base GoalBuddy checker not found: ${checker}`);
    return;
  }
  const result = spawnSync(process.execPath, [checker, statePath], { encoding: "utf8" });
  if (result.status !== 0) {
    try {
      const report = JSON.parse(result.stdout || "{}");
      for (const error of report.errors || []) errors.push(`base state check: ${error}`);
      for (const warning of report.warnings || []) warnings.push(`base state check: ${warning}`);
    } catch {
      errors.push(`base state check failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
    }
  }
}

runBaseChecker();

const goalText = readRequired(goalPath, "goal.md", { minLength: 200 });
const stateText = readRequired(statePath, "state.yaml", { minLength: 200 });
const rawInputText = readRequired(notes.rawInput, "notes/raw-input.md", { minLength: 20 });
const discussionText = readRequired(notes.discussion, "notes/discussion.md", { minLength: 50 });
const qualityText = readRequired(notes.quality, "notes/quality.md", { minLength: 80 });

if (goalText) {
  const goalRequirements = [
    [/Intake Summary/i, "goal.md must include an Intake Summary"],
    [/Goal Prep Compiler Source/i, "goal.md must include a Goal Prep Compiler Source section"],
    [/Deep Intake Source Bundle/i, "goal.md must include a Deep Intake Source Bundle section"],
    [/Deep Intake Trace/i, "goal.md must include a Deep Intake Trace section"],
    [/Completion proof/i, "goal.md must include a completion proof"],
    [/Likely misfire/i, "goal.md must include a likely misfire"],
    [/(Anti-Patterns|do NOT do|Do Not Do)/i, "goal.md must include Anti-Patterns or do-not-do fences"],
    [/(Non-Goals|Non-goals|Non-Negotiable Constraints)/i, "goal.md must include scope, non-goals, or non-negotiable constraints"],
  ];
  for (const [pattern, message] of goalRequirements) {
    if (!pattern.test(goalText)) errors.push(message);
  }
  if (!includesAllNoteRefs(goalText)) {
    errors.push("goal.md must link or name notes/raw-input.md, notes/discussion.md, and notes/quality.md");
  }
  if (!/(goal-prep\/SKILL\.md|Goal Prep templates|Goal Prep checkers|compiled against the current sibling goal-prep)/i.test(goalText)) {
    errors.push("goal.md must state that artifacts were compiled against the current Goal Prep skill spec, templates, or checkers");
  }
  if (!/(read|reads|re-read|reread).{0,120}(notes\/raw-input\.md|notes\/discussion\.md|notes\/quality\.md)/is.test(goalText)) {
    errors.push("goal.md must instruct the /goal PM to read the Deep Intake notes before task selection, advancement, or audit");
  }
  if (!/(user wording|original wording|resolved decision|discussion decision|board choice|board decisions|maps?|trace)/i.test(goalText)) {
    errors.push("goal.md must trace user wording or resolved discussion decisions into concrete board choices");
  }
}

if (rawInputText && /(<[^>]+>|TODO|TBD)/i.test(rawInputText)) {
  errors.push("notes/raw-input.md must contain the user's real wording, not placeholders");
}

if (discussionText && !/(resolved|decision|decided|grounding|checked|scope|non-goal|misfire|anti-pattern)/i.test(discussionText)) {
  errors.push("notes/discussion.md must record resolved decisions, scope, grounding, or misfire discussion");
}

if (qualityText) {
  const qualityRequirements = [
    [/PASS|passed|complete|satisfied/i, "notes/quality.md must record a pass/completion result"],
    [/goal\.md/i, "notes/quality.md must mention goal.md embedding"],
    [/Goal Prep Compiler Source|goal-prep\/SKILL\.md|Goal Prep compiler/i, "notes/quality.md must mention the Goal Prep compiler source"],
    [/source bundle|Deep Intake Source Bundle/i, "notes/quality.md must mention the Deep Intake Source Bundle"],
    [/trace|Deep Intake Trace/i, "notes/quality.md must mention the Deep Intake Trace"],
    [/state\.yaml/i, "notes/quality.md must mention state.yaml routing"],
    [/completion proof/i, "notes/quality.md must mention completion proof"],
    [/likely misfire/i, "notes/quality.md must mention likely misfire"],
  ];
  for (const [pattern, message] of qualityRequirements) {
    if (!pattern.test(qualityText)) errors.push(message);
  }
}

if (stateText) {
  const tasks = parseTasks(stateText);
  const firstValidationTask = tasks.find((task) => ["scout", "judge", "pm"].includes(task.type));
  const finalAudit = tasks.find((task) => task.id === "T999");
  if (!firstValidationTask) {
    errors.push("state.yaml must include an initial Scout, Judge, or PM validation task");
  } else if (!includesAllNoteRefs(firstValidationTask.raw)) {
    errors.push(`${firstValidationTask.id} must list notes/raw-input.md, notes/discussion.md, and notes/quality.md as inputs`);
  }
  if (!finalAudit) {
    errors.push("state.yaml must include T999 final audit");
  } else {
    if (!includesAllNoteRefs(finalAudit.raw)) {
      errors.push("T999 must list notes/raw-input.md, notes/discussion.md, and notes/quality.md as inputs");
    }
    if (!/(reject|contradict|misfire|anti-pattern|Deep Intake)/i.test(finalAudit.raw)) {
      errors.push("T999 must reject completion that contradicts Deep Intake decisions, likely misfire, or anti-pattern fences");
    }
  }
}

const report = {
  ok: errors.length === 0,
  goal_root: root,
  state_path: statePath,
  deep_intake_notes: noteRefs,
  errors,
  warnings,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
