#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve, sep } from "node:path";

const statePath = process.argv[2];
const isChildCheck = process.argv.includes("--child");

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

function clean(value) {
  if (value === undefined || value === null) return null;
  const cleaned = value.replace(/#.*/, "").trim().replace(/^[\'\"]|[\'\"]$/g, "");
  if (cleaned === "" || cleaned === "null") return null;
  if (cleaned === "true") return true;
  if (cleaned === "false") return false;
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  return cleaned;
}

function topScalar(key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
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
      const match = line.match(new RegExp(`^\\s{2}${key}:\\s*(.*?)\\s*$`));
      if (match) return clean(match[1]);
    }
  }
  return null;
}

function sectionText(section) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${section}:\\s*$`).test(line));
  if (start === -1) return "";
  const collected = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i])) break;
    collected.push(lines[i]);
  }
  return collected.join("\n");
}

function parseTasks() {
  const body = sectionText("tasks");
  if (!body) return [];
  const lines = body.split(/\r?\n/);
  const tasks = [];
  let current = null;
  let currentLines = [];

  function finish() {
    if (!current) return;
    current.raw = currentLines.join("\n");
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
  return tasks.map((task) => ({
    ...task,
    type: taskScalar(task, "type"),
    assignee: taskScalar(task, "assignee"),
    status: taskScalar(task, "status"),
    objective: taskScalar(task, "objective"),
    visionAnchor: taskVisionAnchor(task),
    allowedFiles: taskList(task, "allowed_files"),
    verify: taskList(task, "verify"),
    stopIf: taskList(task, "stop_if"),
    receipt: taskReceipt(task),
    subgoal: taskSubgoal(task),
  }));
}

function taskVisionAnchor(task) {
  const lines = task.raw.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s{4}vision_anchor:\s*/.test(line));
  if (start === -1) return { present: false, value: null };
  const inline = clean(lines[start].replace(/^\s{4}vision_anchor:\s*/, ""));
  // clean() returns null for both the literal string "null" and an empty inline value.
  if (inline === null) {
    if (!/^(\s{6}|\s{8})/.test(lines[start + 1] || "")) return { present: true, value: null };
  }
  const blockLines = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s{4}\S/.test(lines[i])) break;
    blockLines.push(lines[i]);
  }
  const raw = blockLines.join("\n");
  const termMatch = raw.match(/^\s{6}term:\s*(.*?)\s*$/m);
  const bashMatch = raw.match(/^\s{8}bash:\s*(.*?)\s*$/m);
  const judgeFallbackMatch = raw.match(/^\s{8}judge_fallback:\s*(.*?)\s*$/m);
  return {
    present: true,
    value: {
      term: termMatch ? clean(termMatch[1]) : null,
      checkCondition: {
        bash: bashMatch ? clean(bashMatch[1]) : null,
        judgeFallback: judgeFallbackMatch ? clean(judgeFallbackMatch[1]) : null,
      },
    },
    raw,
  };
}

function taskScalar(task, key) {
  const match = task.raw.match(new RegExp(`^\\s{4}${key}:\\s*(.*?)\\s*$`, "m"));
  return match ? clean(match[1]) : null;
}

function taskList(task, key) {
  const lines = task.raw.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^\\s{4}${key}:\\s*$`).test(line));
  if (start === -1) return [];
  const values = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s{4}\S/.test(lines[i])) break;
    const item = lines[i].match(/^\s{6}-\s*(.+?)\s*$/);
    if (item) values.push(clean(item[1]));
  }
  return values.filter((value) => value !== null);
}

function taskReceipt(task) {
  const lines = task.raw.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s{4}receipt:\s*/.test(line));
  if (start === -1) return { present: false, value: null, raw: "" };

  const inline = clean(lines[start].replace(/^\s{4}receipt:\s*/, ""));
  if (inline === null && !/^(\s{6}|\s{8})/.test(lines[start + 1] || "")) {
    return { present: true, value: null, raw: "" };
  }

  const receiptLines = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s{4}\S/.test(lines[i])) break;
    receiptLines.push(lines[i]);
  }
  const raw = receiptLines.join("\n");
  return {
    present: true,
    value: inline || "object",
    raw,
    has: (key) => new RegExp(`^\\s{6}${key}:`, "m").test(raw),
    list: (key) => receiptList(raw, key),
    commandStatuses: () => receiptCommandStatuses(raw),
    scalar: (key) => {
      const match = raw.match(new RegExp(`^\\s{6}${key}:\\s*(.*?)\\s*$`, "m"));
      return match ? clean(match[1]) : null;
    },
  };
}

function taskSubgoal(task) {
  const lines = task.raw.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s{4}subgoal:\s*/.test(line));
  if (start === -1) return { present: false };

  const subgoalLines = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s{4}\S/.test(lines[i])) break;
    subgoalLines.push(lines[i]);
  }
  const raw = subgoalLines.join("\n");
  const scalar = (key) => {
    const match = raw.match(new RegExp(`^\\s{6}${key}:\\s*(.*?)\\s*$`, "m"));
    return match ? clean(match[1]) : null;
  };

  return {
    present: true,
    raw,
    status: scalar("status"),
    path: scalar("path"),
    owner: scalar("owner"),
    depth: scalar("depth"),
  };
}

function receiptList(raw, key) {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^\\s{6}${key}:\\s*$`).test(line));
  if (start === -1) return [];
  const values = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s{6}\S/.test(lines[i])) break;
    const item = lines[i].match(/^\s{8}-\s*(.+?)\s*$/);
    if (item) values.push(clean(item[1]));
  }
  return values.filter((value) => value !== null);
}

function receiptCommandStatuses(raw) {
  return [...raw.matchAll(/^\s{10}status:\s*(.*?)\s*$/gm)]
    .map((match) => clean(match[1]))
    .filter((value) => value !== null);
}

function rootEntryErrors() {
  const allowed = new Set(["goal.md", "state.yaml", "notes", ".goalbuddy-board", "subgoals"]);
  const unexpected = [];
  for (const entry of readdirSync(root).filter((item) => item !== ".DS_Store")) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (!allowed.has(entry)) {
      unexpected.push(entry);
    } else if ((entry === "notes" || entry === ".goalbuddy-board" || entry === "subgoals") && !stats.isDirectory()) {
      unexpected.push(`${entry} (must be a directory)`);
    } else if (!["notes", ".goalbuddy-board", "subgoals"].includes(entry) && !stats.isFile()) {
      unexpected.push(`${entry} (must be a file)`);
    }
  }
  return unexpected;
}

const version = topScalar("version");
const goalStatus = nestedScalar("goal", "status");
const activeTask = topScalar("active_task");
const agentStatuses = ["scout", "worker", "judge"].map((agent) => ({
  agent,
  status: nestedScalar("agents", agent),
}));
const allowedAgentStatuses = new Set(["installed", "bundled_not_installed", "missing", "unknown"]);
const continuousUntilFullOutcome = nestedScalar("rules", "continuous_until_full_outcome") === true;
const missingInputOrCredentialsDoNotStopGoal =
  nestedScalar("rules", "missing_input_or_credentials_do_not_stop_goal") === true;
const legacySignals = [
  /^gate:\s*$/m,
  /^artifact_policy:\s*$/m,
  /^active_unit:/m,
  /^evidence\.jsonl/m,
].some((pattern) => pattern.test(text)) || ["units", "artifacts", "evidence.jsonl"].some((entry) => existsSync(join(root, entry)));

if (version !== 2) {
  if (legacySignals) {
    errors.push("legacy v1 goal state detected; GoalBuddy v2 requires version: 2 with a task board. Create a new v2 goal or migrate manually.");
  } else {
    errors.push("state.yaml must declare version: 2");
  }
}

if (!["active", "blocked", "done"].includes(goalStatus)) {
  errors.push(`goal.status must be active, blocked, or done; got ${goalStatus || "<missing>"}`);
}

function agentStatusWarning(agent, status) {
  const agentLabel = agent[0].toUpperCase() + agent.slice(1);
  if (status === "bundled_not_installed") {
    return `agents.${agent} is bundled_not_installed; /goal can continue through PM fallback, but dedicated ${agentLabel} delegation is unavailable until installed. If dedicated agents are required before /goal, run: npx goalbuddy agents`;
  }
  if (status === "missing") {
    return `agents.${agent} is missing; /goal can continue through PM fallback, but dedicated ${agentLabel} delegation is unavailable. If dedicated agents are required before /goal, run: npx goalbuddy install`;
  }
  return `agents.${agent} is unknown; /goal can continue through PM fallback, but dedicated ${agentLabel} delegation was not verified. To check before /goal, run: npx goalbuddy doctor`;
}

for (const { agent, status } of agentStatuses) {
  if (!allowedAgentStatuses.has(status)) {
    errors.push(`agents.${agent} must be one of installed, bundled_not_installed, missing, or unknown; got ${status || "<missing>"}`);
  } else if (status !== "installed") {
    warnings.push(agentStatusWarning(agent, status));
  }
}

if (!existsSync(join(root, "goal.md"))) errors.push("missing goal.md");
if (!existsSync(join(root, "notes")) || !statSync(join(root, "notes")).isDirectory()) {
  errors.push("missing notes/ directory");
}

const unexpected = rootEntryErrors();
if (unexpected.length > 0) {
  errors.push(`unexpected root entries; v2 goal roots may contain only goal.md, state.yaml, notes/, subgoals/, and .goalbuddy-board/: ${unexpected.join(", ")}`);
}

const tasks = parseTasks();
const ids = new Set();
for (const task of tasks) {
  if (!task.id || !/^T\d{3}$/.test(task.id)) errors.push(`task id must use T### format; got ${task.id || "<missing>"}`);
  if (ids.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
  ids.add(task.id);
  if (!["scout", "judge", "worker", "pm"].includes(task.type)) {
    errors.push(`task ${task.id} type must be scout, judge, worker, or pm`);
  }
  if (!["Scout", "Judge", "Worker", "PM"].includes(task.assignee)) {
    errors.push(`task ${task.id} assignee must be Scout, Judge, Worker, or PM`);
  }
  const expectedAssignee = {
    scout: "Scout",
    judge: "Judge",
    worker: "Worker",
    pm: "PM",
  }[task.type];
  if (expectedAssignee && task.assignee !== expectedAssignee) {
    errors.push(`task ${task.id} assignee must be ${expectedAssignee} for type ${task.type}`);
  }
  if (!["queued", "active", "blocked", "done"].includes(task.status)) {
    errors.push(`task ${task.id} status must be queued, active, blocked, or done`);
  }
  if (!task.objective) errors.push(`task ${task.id} missing objective`);
  // vision_anchor PRESENCE rule: if non-null, require term + check_condition.bash + check_condition.judge_fallback.
  if (task.visionAnchor && task.visionAnchor.present && task.visionAnchor.value !== null) {
    const { term, checkCondition } = task.visionAnchor.value;
    if (!term) errors.push(`task ${task.id} vision_anchor missing term (verbatim user-phrase from notes/raw-input.md)`);
    if (!checkCondition || !checkCondition.bash) {
      errors.push(`task ${task.id} vision_anchor missing check_condition.bash (mechanical grep)`);
    }
    if (!checkCondition || !checkCondition.judgeFallback) {
      errors.push(`task ${task.id} vision_anchor missing check_condition.judge_fallback (semantic-survival escape-hatch)`);
    }
  }
}

if (tasks.length === 0) errors.push("tasks must contain at least one task");

const activeTasks = tasks.filter((task) => task.status === "active");
if (goalStatus === "done") {
  if (activeTasks.length !== 0) errors.push("done goals must not have an active task");
  if (activeTask !== null) errors.push("done goals must set active_task: null");
  const unfinishedWorkers = tasks
    .filter((task) => task.type === "worker" && ["queued", "active"].includes(task.status))
    .map((task) => task.id);
  if (unfinishedWorkers.length > 0) {
    errors.push(`done goals must not leave queued or active Worker tasks: ${unfinishedWorkers.join(", ")}`);
  }
} else if (goalStatus === "blocked") {
  if (activeTasks.length > 1) errors.push("blocked goals may have at most one active task");
  if (continuousUntilFullOutcome && missingInputOrCredentialsDoNotStopGoal) {
    errors.push("continuous goals must keep goal.status active; missing input or credentials should block specific tasks, not the whole goal");
  }
} else if (activeTasks.length !== 1) {
  errors.push(`exactly one active task is required while goal.status is active; found ${activeTasks.length}`);
}

if (activeTasks.length === 1 && activeTask !== activeTasks[0].id) {
  errors.push(`active_task must point to active task ${activeTasks[0].id}; got ${activeTask || "null"}`);
}
if (activeTask && !ids.has(activeTask)) errors.push(`active_task points to unknown task: ${activeTask}`);

for (const task of tasks) {
  if (task.subgoal.present) {
    validateSubgoal(task);
  }

  const hasReceipt = task.receipt.present && task.receipt.value !== null;
  const receiptResult = hasReceipt ? task.receipt.scalar("result") : null;
  if (task.status === "done" && !hasReceipt) {
    errors.push(`done task ${task.id} missing receipt`);
  }
  if (task.status === "done" && hasReceipt && receiptResult !== "done") {
    errors.push(`done task ${task.id} receipt must include result: done`);
  }
  if (task.status === "blocked" && !hasReceipt) {
    errors.push(`blocked task ${task.id} missing receipt`);
  }
  if (task.type === "worker" && task.status === "active") {
    if (task.allowedFiles.length === 0) errors.push(`active Worker task ${task.id} must include allowed_files`);
    if (task.verify.length === 0) errors.push(`active Worker task ${task.id} must include verify`);
    if (task.stopIf.length === 0) errors.push(`active Worker task ${task.id} must include stop_if`);
  }
  if (task.type === "worker" && task.status === "done" && hasReceipt) {
    for (const key of ["changed_files", "commands", "summary"]) {
      if (!task.receipt.has(key)) errors.push(`Worker receipt for ${task.id} missing ${key}`);
    }
    const changedFiles = task.receipt.list("changed_files");
    if (changedFiles.length === 0) {
      errors.push(`Worker receipt for ${task.id} changed_files must list at least one file`);
    }
    for (const changedFile of changedFiles) {
      if (!matchesAllowedFile(changedFile, task.allowedFiles)) {
        errors.push(`Worker receipt for ${task.id} changed file outside allowed_files: ${changedFile}`);
      }
    }
    const commandStatuses = task.receipt.commandStatuses();
    if (task.receipt.has("commands") && commandStatuses.length === 0) {
      errors.push(`Worker receipt for ${task.id} commands must include status fields`);
    }
    for (const status of commandStatuses) {
      if (status !== "pass") {
        errors.push(`Worker receipt for ${task.id} has non-passing command status: ${status}`);
      }
    }
  }
  if (task.type === "scout" && task.status === "done" && hasReceipt) {
    if (!task.receipt.has("summary")) errors.push(`Scout receipt for ${task.id} missing summary`);
    if (!task.receipt.has("evidence") && !task.receipt.has("note")) {
      errors.push(`Scout receipt for ${task.id} must include evidence or note`);
    }
  }
  if (task.type === "judge" && task.status === "done" && hasReceipt && !task.receipt.has("decision")) {
    errors.push(`Judge receipt for ${task.id} missing decision`);
  }
  // vision_anchor SATISFACTION rule: any done task with a non-null vision_anchor must include
  // receipt.vision_anchor_evidence proving anchor's semantic survived (either bash-PASS or
  // judge semantic_survived assessment per anchor's check_condition).
  if (task.status === "done" && hasReceipt && task.visionAnchor && task.visionAnchor.present && task.visionAnchor.value !== null) {
    if (!task.receipt.has("vision_anchor_evidence")) {
      errors.push(`done task ${task.id} declares vision_anchor but receipt missing vision_anchor_evidence (Worker/Scout/Judge must surface either bash-grep PASS or judge semantic_survived assessment per anchor's check_condition)`);
    }
  }
}

function validateSubgoal(task) {
  if (isChildCheck) {
    errors.push(`child task ${task.id} must not contain a nested subgoal`);
    return;
  }

  if (!["active", "blocked", "done"].includes(task.subgoal.status)) {
    errors.push(`task ${task.id} subgoal.status must be active, blocked, or done; got ${task.subgoal.status || "<missing>"}`);
  }
  if (task.subgoal.depth !== 1) {
    errors.push(`task ${task.id} subgoal.depth must be 1; got ${task.subgoal.depth || "<missing>"}`);
  }
  if (!task.subgoal.path) {
    errors.push(`task ${task.id} subgoal.path is required`);
    return;
  }

  const rootPath = resolve(root);
  const childStatePath = resolve(rootPath, task.subgoal.path);
  if (childStatePath !== rootPath && !childStatePath.startsWith(`${rootPath}${sep}`)) {
    errors.push(`task ${task.id} subgoal.path must stay inside the goal root: ${task.subgoal.path}`);
    return;
  }
  if (basename(childStatePath) !== "state.yaml") {
    errors.push(`task ${task.id} subgoal.path must point to a state.yaml file`);
    return;
  }
  if (!existsSync(childStatePath)) {
    errors.push(`task ${task.id} subgoal state file not found: ${task.subgoal.path}`);
    return;
  }

  const result = spawnSync(process.execPath, [process.argv[1], childStatePath, "--child"], {
    encoding: "utf8",
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    errors.push(`task ${task.id} subgoal checker produced invalid output for ${task.subgoal.path}`);
    return;
  }
  if (result.status !== 0 || !report.ok) {
    for (const childError of report.errors || ["unknown child state error"]) {
      errors.push(`task ${task.id} subgoal invalid: ${childError}`);
    }
  }
}

function matchesAllowedFile(file, allowedFiles) {
  return allowedFiles.some((pattern) => globMatch(pattern, file));
}

function globMatch(pattern, file) {
  const normalizedPattern = normalizePathPattern(pattern);
  const normalizedFile = normalizePathPattern(file);
  if (normalizedPattern === normalizedFile) return true;
  const token = "__GOALBUDDY_GLOBSTAR__";
  const regexSource = escapeRegExp(normalizedPattern)
    .replace(/\*\*/g, token)
    .replace(/\*/g, "[^/]*")
    .replace(new RegExp(token, "g"), ".*");
  const regex = new RegExp(`^${regexSource}$`);
  return regex.test(normalizedFile);
}

function normalizePathPattern(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

if (goalStatus === "done") {
  const finalAudit = tasks.some((task) => {
    if (!["judge", "pm"].includes(task.type) || task.status !== "done") return false;
    if (!task.receipt.present || task.receipt.value === null) return false;
    const decision = task.receipt.scalar("decision");
    return decision === "complete" || decision === "done";
  });
  if (!finalAudit) {
    errors.push("completion requires a final done Judge or PM audit receipt with decision: complete");
  }
  if (continuousUntilFullOutcome) {
    const finalFullOutcomeAudit = tasks.some((task) => {
      if (!["judge", "pm"].includes(task.type) || task.status !== "done") return false;
      if (!task.receipt.present || task.receipt.value === null) return false;
      const decision = task.receipt.scalar("decision");
      const fullOutcomeComplete = task.receipt.scalar("full_outcome_complete");
      return (decision === "complete" || decision === "done") && fullOutcomeComplete === true;
    });
    if (!finalFullOutcomeAudit) {
      errors.push("continuous goals require a final done Judge or PM audit receipt with full_outcome_complete: true before goal.status: done");
    }
  }
}

const result = {
  ok: errors.length === 0,
  version,
  state_path: statePath,
  goal_status: goalStatus,
  active_task: activeTask,
  agent_statuses: Object.fromEntries(agentStatuses.map(({ agent, status }) => [agent, status])),
  task_count: tasks.length,
  errors,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
