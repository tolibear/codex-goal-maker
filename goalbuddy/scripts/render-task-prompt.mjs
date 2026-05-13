#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGoalStateText } from "../extend/local-goal-board/scripts/lib/goal-board.mjs";

const ROLE_DEFAULTS = {
  scout: { agent: "goal_scout", reasoning: "low", sandbox: "read-only" },
  judge: { agent: "goal_judge", reasoning: "high", sandbox: "read-only" },
  worker: { agent: "goal_worker", reasoning: "low", sandbox: "workspace-write" },
  pm: { agent: "PM", reasoning: "medium", sandbox: "workspace-write" },
};

if (isDirectRun()) {
  try {
    const result = renderTaskPrompt(parseArgs(process.argv.slice(2)));
    if (result.json) {
      console.log(JSON.stringify(result.payload, null, 2));
    } else {
      console.log(formatPrompt(result.payload));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export function renderTaskPrompt(options) {
  const boardPath = resolveBoardPath(options);
  const board = loadBoard(boardPath);
  const task = selectTask(board, options.taskId);
  const role = normalizeRole(task.type);
  const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.pm;
  const reasoning = normalizeReasoning(task.reasoning_hint, defaults.reasoning);
  const warnings = promptWarnings(board, task);

  return {
    json: options.json,
    payload: {
      metadata: {
        recommended_agent: defaults.agent,
        required_spawn_agent_type: defaults.agent === "PM" ? null : defaults.agent,
        recommended_reasoning: reasoning,
        sandbox: defaults.sandbox,
        fork_context_allowed: role !== "worker",
        board_path: board.path,
        child_board_paths: childBoardPaths(board),
        warnings,
      },
      task: {
        id: task.id,
        type: role,
        assignee: task.assignee || defaults.agent,
        status: task.status,
        objective: task.objective || "",
        inputs: stringList(task.inputs),
        constraints: stringList(task.constraints),
        allowed_files: stringList(task.allowed_files),
        verify: stringList(task.verify),
        stop_if: stringList(task.stop_if),
        reasoning_hint: task.reasoning_hint || null,
        expected_output: stringList(task.expected_output),
      },
      receipt_schema: receiptSchema(role),
    },
  };
}

export function parseArgs(args) {
  const options = { goalRoot: "", boardPath: "", taskId: "", json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--task") {
      options.taskId = args[++index] || "";
    } else if (arg.startsWith("--task=")) {
      options.taskId = arg.slice("--task=".length);
    } else if (arg === "--board") {
      options.boardPath = args[++index] || "";
    } else if (arg.startsWith("--board=")) {
      options.boardPath = arg.slice("--board=".length);
    } else if (arg === "--parallel-plan") {
      options.parallelPlan = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown argument: ${arg}`);
    } else if (!options.goalRoot) {
      options.goalRoot = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  if (!options.goalRoot && !options.boardPath) {
    throw new Error("Usage: goalbuddy prompt <goal-root> [--task T###] [--board path/to/state.yaml]");
  }
  return options;
}

export function loadBoard(boardPath) {
  if (!existsSync(boardPath)) throw new Error(`state file not found: ${boardPath}`);
  const document = parseGoalStateText(readFileSync(boardPath, "utf8"));
  if (!document || Number(document.version) !== 2) {
    throw new Error(`unsupported GoalBuddy state version in ${boardPath}`);
  }
  if (!Array.isArray(document.tasks)) throw new Error(`state file has no tasks: ${boardPath}`);
  return {
    path: boardPath,
    root: dirname(boardPath),
    document,
    tasks: document.tasks,
    goal: document.goal || {},
    activeTask: document.active_task || "",
  };
}

export function resolveBoardPath(options) {
  const candidate = options.boardPath || options.goalRoot;
  if (!candidate) throw new Error("Missing goal root or board path.");
  const resolved = resolve(candidate);
  if (basename(resolved) === "state.yaml") return resolved;
  return resolve(resolved, "state.yaml");
}

export function selectTask(board, taskId = "") {
  const id = taskId || board.activeTask;
  if (!id) throw new Error(`No task selected and active_task is empty in ${board.path}`);
  const task = board.tasks.find((candidate) => candidate?.id === id);
  if (!task) throw new Error(`Task ${id} not found in ${board.path}`);
  return task;
}

export function childBoardPaths(board) {
  return board.tasks
    .map((task) => task?.subgoal?.path)
    .filter(Boolean)
    .map((childPath) => resolve(board.root, childPath));
}

function promptWarnings(board, task) {
  const warnings = [];
  const role = normalizeRole(task.type);
  if (task.id !== board.activeTask) warnings.push(`Task ${task.id} is not the active task on this board.`);
  if (role === "worker") {
    if (stringList(task.allowed_files).length === 0) warnings.push(`Worker task ${task.id} has no allowed_files.`);
    if (stringList(task.verify).length === 0) warnings.push(`Worker task ${task.id} has no verify commands.`);
    if (stringList(task.stop_if).length === 0) warnings.push(`Worker task ${task.id} has no stop_if conditions.`);
  }
  for (const candidate of board.tasks) {
    if (candidate?.subgoal && Number(candidate.subgoal.depth) !== 1) {
      warnings.push(`Task ${candidate.id} has subgoal.depth ${candidate.subgoal.depth || "<missing>"}; only depth 1 is supported.`);
    }
  }
  return warnings;
}

function normalizeRole(value) {
  const role = String(value || "pm").toLowerCase();
  return ROLE_DEFAULTS[role] ? role : "pm";
}

function normalizeReasoning(value, fallback) {
  const hint = String(value || "").toLowerCase();
  if (["low", "medium", "high", "xhigh"].includes(hint)) return hint;
  return fallback;
}

function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined).map(String) : [];
}

function receiptSchema(role) {
  if (role === "worker") {
    return {
      result: "done | blocked",
      changed_files: [],
      commands: [{ cmd: "<command>", status: "pass | fail | not_run" }],
      summary: "<=120 words",
      remaining_blockers: [],
      needs_judge: false,
    };
  }
  if (role === "judge") {
    return {
      result: "done | blocked",
      decision: "approve_next | reject_next | approve_subgoal | reject_subgoal | not_complete | complete",
      evidence: [],
      next_allowed_task: null,
      blocked_tasks: [],
      required_board_updates: [],
    };
  }
  return {
    result: "done | blocked",
    summary: "<=120 words",
    evidence: [],
    facts: [],
    contradictions: [],
    ambiguity_requiring_judge: [],
  };
}

function formatPrompt(payload) {
  const lines = [
    "GoalBuddy task prompt",
    "",
    "Metadata:",
    `- recommended_agent: ${payload.metadata.recommended_agent}`,
    `- required_spawn_agent_type: ${payload.metadata.required_spawn_agent_type || "PM fallback"}`,
    `- recommended_reasoning: ${payload.metadata.recommended_reasoning}`,
    `- sandbox: ${payload.metadata.sandbox}`,
    `- fork_context_allowed: ${payload.metadata.fork_context_allowed}`,
    `- board_path: ${payload.metadata.board_path}`,
  ];
  if (payload.metadata.child_board_paths.length) {
    lines.push("- child_board_paths:");
    for (const path of payload.metadata.child_board_paths) lines.push(`  - ${path}`);
  }
  if (payload.metadata.warnings.length) {
    lines.push("- warnings:");
    for (const warning of payload.metadata.warnings) lines.push(`  - ${warning}`);
  }

  lines.push(
    "",
    "Spawn contract:",
    `- Codex spawn_agent agent_type: ${payload.metadata.required_spawn_agent_type || "do not spawn; run as PM"}`,
    "- Do not substitute generic scout, worker, or judge agents for GoalBuddy agents.",
    "- If the required GoalBuddy agent is unavailable, stop spawning and continue as PM fallback or install agents.",
    "- After one wait_agent timeout with no visible allowed-file changes, stop waiting and recover deterministically.",
    "",
    "Task:",
    `- id: ${payload.task.id}`,
    `- type: ${payload.task.type}`,
    `- assignee: ${payload.task.assignee}`,
    `- status: ${payload.task.status}`,
    `- objective: ${payload.task.objective}`,
  );
  addList(lines, "inputs", payload.task.inputs);
  addList(lines, "constraints", payload.task.constraints);
  addList(lines, "allowed_files", payload.task.allowed_files);
  addList(lines, "verify", payload.task.verify);
  addList(lines, "stop_if", payload.task.stop_if);
  addList(lines, "expected_output", payload.task.expected_output);
  lines.push("", "Expected receipt JSON shape:", JSON.stringify(payload.receipt_schema, null, 2));
  return lines.join("\n");
}

function addList(lines, label, values) {
  if (!values.length) return;
  lines.push(`- ${label}:`);
  for (const value of values) lines.push(`  - ${value}`);
}

function isDirectRun() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
