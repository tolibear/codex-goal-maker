import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VALID_STATUSES = new Set(["queued", "active", "blocked", "done"]);
const COLUMN_ORDER = ["todo", "in-progress", "blocked", "completed"];
const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(__dirname, "../..");
const logoAssetPath = join(extensionRoot, "assets", "goalbuddy-mark.png");

export class GoalBoardError extends Error {
  constructor(message) {
    super(message);
    this.name = "GoalBoardError";
  }
}

export async function loadGoalBoard(goalDir) {
  const root = resolve(goalDir);
  const statePath = join(root, "state.yaml");
  if (!existsSync(statePath)) {
    throw new GoalBoardError(`Missing state.yaml: ${statePath}`);
  }
  const text = await readFile(statePath, "utf8");
  return normalizeGoalBoard(parseGoalStateText(text), root);
}

export function createBoardPayload(goalDir) {
  const root = resolve(goalDir);
  const statePath = join(root, "state.yaml");
  if (!existsSync(statePath)) {
    throw new GoalBoardError(`Missing state.yaml: ${statePath}`);
  }

  const document = parseGoalStateText(readFileSync(statePath, "utf8"));
  const board = normalizeGoalBoard(document, root);
  const noteIndex = loadNotes(root);
  const tasks = board.tasks.map((task) => attachTaskNote(task, noteIndex));
  const columns = buildColumns(tasks);
  const stateStat = statSync(statePath);

  return {
    generatedAt: new Date().toISOString(),
    source: {
      goalDir: root,
      statePath,
      stateMtimeMs: stateStat.mtimeMs,
      notesDir: join(root, "notes"),
    },
    goal: {
      title: board.title,
      slug: board.slug,
      kind: board.kind,
      status: board.status,
      tranche: board.tranche,
      activeTask: board.activeTask,
    },
    counts: {
      total: tasks.length,
      todo: columns.find((column) => column.id === "todo").tasks.length,
      inProgress: columns.find((column) => column.id === "in-progress").tasks.length,
      blocked: columns.find((column) => column.id === "blocked").tasks.length,
      completed: columns.find((column) => column.id === "completed").tasks.length,
    },
    columns,
    tasks,
    notes: Object.values(noteIndex).map(({ path, title, mtimeMs }) => ({ path, title, mtimeMs })),
  };
}

export function normalizeGoalBoard(document, goalDir = "<memory>") {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new GoalBoardError("Goal state must be a YAML mapping.");
  }
  if (Number(document.version) !== 2) {
    throw new GoalBoardError("Only GoalBuddy v2 state.yaml files are supported.");
  }
  if (!document.goal || typeof document.goal !== "object") {
    throw new GoalBoardError("Missing goal metadata.");
  }
  if (!Array.isArray(document.tasks) || document.tasks.length === 0) {
    throw new GoalBoardError("Missing non-empty tasks list.");
  }

  const tasks = document.tasks.map((task, index) => normalizeTask(task, index));
  const activeTasks = tasks.filter((task) => task.status === "active");
  if (activeTasks.length > 1) {
    throw new GoalBoardError("Goal state has more than one active task.");
  }

  return {
    goalDir,
    title: cleanText(document.goal.title || "Untitled goal"),
    slug: cleanText(document.goal.slug || "untitled-goal"),
    kind: cleanText(document.goal.kind || "open_ended"),
    tranche: cleanText(document.goal.tranche || ""),
    status: cleanText(document.goal.status || "active"),
    activeTask: cleanText(document.active_task || activeTasks[0]?.id || ""),
    tasks,
  };
}

export function normalizeTask(task, index) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new GoalBoardError(`Task ${index + 1} must be a mapping.`);
  }

  const id = cleanText(task.id);
  const status = normalizeTaskStatus(task.status);
  if (!id) throw new GoalBoardError(`Task ${index + 1} is missing id.`);
  if (!VALID_STATUSES.has(status)) {
    throw new GoalBoardError(`Task ${id} has unsupported status "${status}".`);
  }

  return {
    id,
    title: titleForTask(task),
    objective: cleanText(task.objective || ""),
    status,
    column: columnForStatus(status),
    type: cleanText(task.type || "pm"),
    assignee: cleanText(task.assignee || ""),
    active: status === "active",
    inputs: normalizeStringList(task.inputs),
    constraints: normalizeStringList(task.constraints),
    expectedOutput: normalizeStringList(task.expected_output),
    allowedFiles: normalizeStringList(task.allowed_files),
    verify: normalizeStringList(task.verify),
    stopIf: normalizeStringList(task.stop_if),
    receipt: normalizeReceipt(task.receipt),
  };
}

export function buildColumns(tasks) {
  const byColumn = new Map(COLUMN_ORDER.map((id) => [id, []]));
  for (const task of tasks) {
    byColumn.get(task.column).push(task);
  }

  for (const columnTasks of byColumn.values()) {
    columnTasks.sort((left, right) => taskSortKey(left).localeCompare(taskSortKey(right)));
  }

  return [
    { id: "todo", title: "Todo", description: "Queued work ready to pull", tasks: byColumn.get("todo") },
    { id: "in-progress", title: "In Progress", description: "The active task", tasks: byColumn.get("in-progress") },
    { id: "blocked", title: "Blocked", description: "Needs unblock or a smaller slice", tasks: byColumn.get("blocked") },
    { id: "completed", title: "Completed", description: "Receipted work", tasks: byColumn.get("completed") },
  ];
}

export function writeBoardApp(goalDir) {
  const appDir = join(resolve(goalDir), ".goalbuddy-board");
  mkdirSync(appDir, { recursive: true });
  writeFileSync(join(appDir, "index.html"), `${boardHtml()}\n`);
  writeFileSync(join(appDir, "styles.css"), `${boardCss()}\n`);
  writeFileSync(join(appDir, "app.js"), `${boardJs()}\n`);
  copyFileSync(logoAssetPath, join(appDir, "goalbuddy-mark.png"));
  return appDir;
}

function attachTaskNote(task, noteIndex) {
  const notePath = task.receipt.note || "";
  if (!notePath) return task;
  const normalized = notePath.replaceAll("\\", "/").replace(/^\.?\//, "");
  return {
    ...task,
    note: noteIndex[normalized] || null,
  };
}

function loadNotes(goalDir) {
  const notesDir = join(goalDir, "notes");
  if (!existsSync(notesDir)) return {};

  const notes = {};
  for (const entry of readdirSync(notesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const path = `notes/${entry.name}`;
    const absolute = join(notesDir, entry.name);
    const content = readFileSync(absolute, "utf8");
    notes[path] = {
      path,
      title: noteTitle(content, entry.name),
      content,
      mtimeMs: statSync(absolute).mtimeMs,
    };
  }
  return notes;
}

function noteTitle(content, filename) {
  const heading = content.split(/\r?\n/).find((line) => line.startsWith("# "));
  return heading ? heading.replace(/^#\s+/, "").trim() : basename(filename, ".md");
}

function normalizeReceipt(receipt) {
  if (!receipt) return { present: false, summary: "", result: "", note: "" };
  if (typeof receipt === "string") {
    return { present: true, summary: cleanText(receipt), result: "", note: "" };
  }
  if (Array.isArray(receipt) || typeof receipt !== "object") {
    return { present: true, summary: cleanText(receipt), result: "", note: "" };
  }
  return {
    present: true,
    result: cleanText(receipt.result || ""),
    summary: cleanText(receipt.summary || receipt.decision || receipt.note || receipt.result || ""),
    decision: cleanText(receipt.decision || ""),
    note: cleanText(receipt.note || ""),
    changedFiles: normalizeStringList(receipt.changed_files),
    commands: normalizeCommands(receipt.commands),
    evidence: normalizeStringList(receipt.evidence),
  };
}

function normalizeCommands(commands) {
  if (!commands) return [];
  if (!Array.isArray(commands)) return [cleanText(commands)].filter(Boolean).map((cmd) => ({ cmd, status: "" }));
  return commands.map((command) => {
    if (typeof command === "string") return { cmd: cleanText(command), status: "" };
    return {
      cmd: cleanText(command?.cmd || ""),
      status: cleanText(command?.status || ""),
    };
  }).filter((command) => command.cmd || command.status);
}

function titleForTask(task) {
  const objective = cleanText(task.objective || "Untitled task");
  return objective.replace(/\.$/, "");
}

function columnForStatus(status) {
  if (status === "blocked") return "blocked";
  if (status === "done") return "completed";
  if (status === "queued") return "todo";
  return "in-progress";
}

function taskSortKey(task) {
  const rank = task.status === "active" ? "0" : task.status === "queued" ? "1" : task.status === "blocked" ? "2" : "3";
  return `${rank}:${task.id}`;
}

function normalizeStringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  return [cleanText(value)].filter(Boolean);
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeTaskStatus(value) {
  const status = cleanText(value).toLowerCase();
  if (status === "complete" || status === "completed") return "done";
  return status;
}

export function parseGoalStateText(text) {
  try {
    const lines = tokenizeYaml(text);
    if (!lines.length) throw new GoalBoardError("Goal state is empty.");
    const [value, nextIndex] = parseBlock(lines, 0, lines[0].indent);
    if (nextIndex < lines.length) {
      throw new GoalBoardError(`Could not parse line ${lines[nextIndex].number}.`);
    }
    return value;
  } catch (error) {
    if (!(error instanceof GoalBoardError) || !/Could not parse line|Expected key\/value pair/.test(error.message)) {
      throw error;
    }
    return parseGoalBoardSubset(text);
  }
}

function parseGoalBoardSubset(text) {
  const version = topScalar(text, "version");
  if (version === null) throw new GoalBoardError("Goal state is empty.");

  return {
    version,
    goal: {
      title: nestedScalar(text, "goal", "title") ?? "",
      slug: nestedScalar(text, "goal", "slug") ?? "",
      kind: nestedScalar(text, "goal", "kind") ?? "",
      tranche: nestedScalar(text, "goal", "tranche") ?? "",
      status: nestedScalar(text, "goal", "status") ?? "",
    },
    active_task: topScalar(text, "active_task"),
    tasks: parseTaskSubset(text),
  };
}

function parseTaskSubset(text) {
  const body = sectionText(text, "tasks");
  if (!body) return [];

  const lines = body.split(/\r?\n/);
  const tasks = [];
  let currentId = null;
  let currentLines = [];

  function finishCurrent() {
    if (!currentId) return;
    tasks.push(buildTaskSubset(currentId, currentLines.join("\n")));
  }

  for (const line of lines) {
    const idMatch = line.match(/^\s{2}-\s+id:\s*(.+?)\s*$/);
    if (idMatch) {
      finishCurrent();
      currentId = cleanYamlValue(idMatch[1]);
      currentLines = [line];
      continue;
    }
    if (currentId) currentLines.push(line);
  }
  finishCurrent();
  return tasks;
}

function buildTaskSubset(id, raw) {
  return {
    id,
    title: taskScalar(raw, "title") ?? "",
    type: taskScalar(raw, "type") ?? "",
    assignee: taskScalar(raw, "assignee") ?? "",
    status: taskScalar(raw, "status") ?? "",
    objective: taskScalar(raw, "objective") ?? "",
    inputs: taskList(raw, "inputs"),
    constraints: taskList(raw, "constraints"),
    expected_output: taskList(raw, "expected_output"),
    allowed_files: taskList(raw, "allowed_files"),
    verify: taskList(raw, "verify"),
    stop_if: taskList(raw, "stop_if"),
    receipt: taskReceipt(raw),
    subgoal: taskSubgoal(raw),
  };
}

function taskScalar(raw, key) {
  const match = raw.match(new RegExp(`^\\s{4}${key}:\\s*(.*?)\\s*$`, "m"));
  return match ? cleanYamlValue(match[1]) : null;
}

function taskList(raw, key) {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^\\s{4}${key}:\\s*$`).test(line));
  if (start === -1) return [];

  const values = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{4}\S/.test(lines[index])) break;
    const item = lines[index].match(/^\s{6}-\s*(.+?)\s*$/);
    if (item) values.push(cleanYamlValue(item[1]));
  }
  return values.filter((value) => value !== null);
}

function taskReceipt(raw) {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s{4}receipt:\s*/.test(line));
  if (start === -1) return null;

  const inline = cleanYamlValue(lines[start].replace(/^\s{4}receipt:\s*/, ""));
  if (inline !== null && inline !== "object") return inline;
  if (inline === null && !/^(\s{6}|\s{8})/.test(lines[start + 1] || "")) return null;

  const receiptLines = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{4}\S/.test(lines[index])) break;
    receiptLines.push(lines[index]);
  }
  const receiptRaw = receiptLines.join("\n");
  return {
    result: receiptScalar(receiptRaw, "result"),
    summary: receiptScalar(receiptRaw, "summary"),
    decision: receiptScalar(receiptRaw, "decision"),
    note: receiptScalar(receiptRaw, "note"),
    changed_files: receiptList(receiptRaw, "changed_files"),
    commands: receiptCommands(receiptRaw),
    evidence: receiptList(receiptRaw, "evidence"),
  };
}

function taskSubgoal(raw) {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s{4}subgoal:\s*/.test(line));
  if (start === -1) return null;

  const subgoalLines = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{4}\S/.test(lines[index])) break;
    subgoalLines.push(lines[index]);
  }
  const subgoalRaw = subgoalLines.join("\n");
  return {
    status: receiptScalar(subgoalRaw, "status"),
    path: receiptScalar(subgoalRaw, "path"),
    owner: receiptScalar(subgoalRaw, "owner"),
    depth: receiptScalar(subgoalRaw, "depth"),
    rollup_receipt: receiptScalar(subgoalRaw, "rollup_receipt"),
  };
}

function receiptScalar(raw, key) {
  const match = raw.match(new RegExp(`^\\s{6}${key}:\\s*(.*?)\\s*$`, "m"));
  return match ? cleanYamlValue(match[1]) : null;
}

function receiptList(raw, key) {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^\\s{6}${key}:\\s*$`).test(line));
  if (start === -1) return [];

  const values = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{6}\S/.test(lines[index])) break;
    const item = lines[index].match(/^\s{8}-\s*(.+?)\s*$/);
    if (item) values.push(cleanYamlValue(item[1]));
  }
  return values.filter((value) => value !== null);
}

function receiptCommands(raw) {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s{6}commands:\s*$/.test(line));
  if (start === -1) return [];

  const commands = [];
  let current = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s{6}\S/.test(line)) break;

    const stringMatch = line.match(/^\s{8}-\s*(.+?)\s*$/);
    if (stringMatch) {
      if (current) commands.push(current);
      current = { cmd: cleanYamlValue(stringMatch[1]), status: "" };
      continue;
    }

    const cmdMatch = line.match(/^\s{10}cmd:\s*(.+?)\s*$/);
    if (cmdMatch) {
      if (current) commands.push(current);
      current = { cmd: cleanYamlValue(cmdMatch[1]), status: "" };
      continue;
    }

    const statusMatch = line.match(/^\s{10}status:\s*(.+?)\s*$/);
    if (statusMatch) {
      if (!current) current = { cmd: "", status: "" };
      current.status = cleanYamlValue(statusMatch[1]) || "";
    }
  }
  if (current) commands.push(current);
  return commands.filter((command) => command.cmd || command.status);
}

function topScalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"));
  return match ? cleanYamlValue(match[1]) : null;
}

function nestedScalar(text, section, key) {
  const body = sectionText(text, section);
  if (!body) return null;
  const match = body.match(new RegExp(`^\\s{2}${key}:\\s*(.*?)\\s*$`, "m"));
  return match ? cleanYamlValue(match[1]) : null;
}

function sectionText(text, section) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => new RegExp(`^${section}:\\s*$`).test(line));
  if (start === -1) return "";

  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\S/.test(lines[index])) break;
    collected.push(lines[index]);
  }
  return collected.join("\n");
}

function cleanYamlValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "~") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return unquote(trimmed);
  }
  return trimmed;
}

function tokenizeYaml(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((raw, index) => {
      const withoutComments = stripComment(raw).replace(/\s+$/, "");
      if (!withoutComments.trim()) return null;
      const indent = withoutComments.match(/^ */)[0].length;
      if (indent % 2 !== 0) {
        throw new GoalBoardError(`Unsupported odd indentation at line ${index + 1}.`);
      }
      return {
        number: index + 1,
        indent,
        text: withoutComments.trimStart(),
      };
    })
    .filter(Boolean);
}

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = line[index - 1];
    if ((char === "\"" || char === "'") && previous !== "\\") {
      quote = quote === char ? null : quote || char;
      continue;
    }
    if (char === "#" && !quote && (index === 0 || /\s/.test(previous))) {
      return line.slice(0, index);
    }
  }
  return line;
}

function parseBlock(lines, index, indent) {
  if (index >= lines.length) return [{}, index];
  if (lines[index].indent < indent) return [{}, index];
  if (lines[index].text.startsWith("- ")) return parseArray(lines, index, indent);
  return parseObject(lines, index, indent);
}

function parseObject(lines, index, indent) {
  const object = {};
  while (index < lines.length) {
    const line = lines[index];
    if (line.indent < indent) break;
    if (line.indent !== indent || line.text.startsWith("- ")) break;

    const { key, valueText } = splitKeyValue(line);
    index += 1;

    if (valueText === "") {
      if (index < lines.length && lines[index].indent > indent) {
        const [child, nextIndex] = parseBlock(lines, index, lines[index].indent);
        object[key] = child;
        index = nextIndex;
      } else {
        object[key] = {};
      }
    } else {
      object[key] = parseScalar(valueText);
    }
  }
  return [object, index];
}

function parseArray(lines, index, indent) {
  const array = [];
  while (index < lines.length) {
    const line = lines[index];
    if (line.indent !== indent || !line.text.startsWith("- ")) break;

    const content = line.text.slice(2).trim();
    index += 1;

    if (content === "") {
      if (index < lines.length && lines[index].indent > indent) {
        const [child, nextIndex] = parseBlock(lines, index, lines[index].indent);
        array.push(child);
        index = nextIndex;
      } else {
        array.push(null);
      }
      continue;
    }

    if (isInlineMapping(content)) {
      const object = {};
      const { key, valueText } = splitKeyValue({ text: content, number: line.number });
      object[key] = valueText === "" ? {} : parseScalar(valueText);
      if (index < lines.length && lines[index].indent > indent) {
        const [child, nextIndex] = parseBlock(lines, index, lines[index].indent);
        if (child && typeof child === "object" && !Array.isArray(child)) {
          Object.assign(object, child);
        } else {
          throw new GoalBoardError(`Expected mapping below line ${line.number}.`);
        }
        index = nextIndex;
      }
      array.push(object);
    } else {
      array.push(parseScalar(content));
    }
  }
  return [array, index];
}

function splitKeyValue(line) {
  const separator = line.text.indexOf(":");
  if (separator <= 0) {
    throw new GoalBoardError(`Expected key/value pair at line ${line.number}.`);
  }
  return {
    key: line.text.slice(0, separator).trim(),
    valueText: line.text.slice(separator + 1).trim(),
  };
}

function isInlineMapping(text) {
  return /^[A-Za-z0-9_.-]+:\s*/.test(text);
}

function parseScalar(text) {
  if (text === "[]") return [];
  if (text === "{}") return {};
  if (text === "null" || text === "~") return null;
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineArray(inner).map(parseScalar);
  }
  if (
    (text.startsWith("\"") && text.endsWith("\"")) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return unquote(text);
  }
  if (text === "|" || text === ">") {
    throw new GoalBoardError("Block scalar YAML is not supported by this lightweight parser.");
  }
  return text;
}

function unquote(text) {
  if (text.startsWith("'")) return text.slice(1, -1).replace(/''/g, "'");
  return text
    .slice(1, -1)
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

function splitInlineArray(text) {
  const values = [];
  let quote = null;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const previous = text[index - 1];
    if ((char === "\"" || char === "'") && previous !== "\\") {
      quote = quote === char ? null : quote || char;
      continue;
    }
    if (char === "," && !quote) {
      values.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  values.push(text.slice(start).trim());
  return values;
}

function boardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GoalBuddy Board</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <header class="topbar">
    <div class="brand" aria-label="GoalBuddy">
      <img class="brand-mark" src="./goalbuddy-mark.png" alt="GoalBuddy">
      <span class="brand-name">GoalBuddy</span>
    </div>
    <div class="live-state" id="live-state">Connecting</div>
  </header>
  <main class="shell">
    <section class="goal-header" aria-labelledby="goal-title">
      <div>
        <p class="eyebrow">Local board</p>
        <h1 id="goal-title">GoalBuddy Board</h1>
        <p id="goal-tranche" class="goal-tranche"></p>
      </div>
      <dl class="goal-meta">
        <div><dt>Status</dt><dd id="goal-status">Unknown</dd></div>
        <div><dt>Active</dt><dd id="goal-active">None</dd></div>
        <div><dt>Updated</dt><dd id="goal-updated">Waiting</dd></div>
      </dl>
    </section>
    <section class="board" id="board" aria-label="Goal task board"></section>
  </main>
  <div class="modal" id="task-modal" hidden>
    <button class="modal-scrim" type="button" data-close-modal aria-label="Close task detail"></button>
    <article class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-header">
        <div>
          <p class="eyebrow" id="modal-kicker">Task</p>
          <h2 id="modal-title">Task detail</h2>
        </div>
        <button class="icon-button" type="button" data-close-modal aria-label="Close task detail">x</button>
      </header>
      <div class="modal-body" id="modal-body"></div>
    </article>
  </div>
  <script src="./app.js" type="module"></script>
</body>
</html>`;
}

function boardCss() {
  return `:root {
  color-scheme: light;
  --canvas: #f7f6f3;
  --surface: #ffffff;
  --surface-muted: #fbfbfa;
  --ink: #111111;
  --muted: #787774;
  --line: #eaeaea;
  --blue-bg: #e1f3fe;
  --blue-text: #1f6c9f;
  --green-bg: #edf3ec;
  --green-text: #346538;
  --red-bg: #fdebec;
  --red-text: #9f2f2d;
  --yellow-bg: #fbf3db;
  --yellow-text: #956400;
  font-family: "SF Pro Display", "Geist Sans", "Helvetica Neue", Arial, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--canvas);
  color: var(--ink);
}

button,
input,
textarea {
  font: inherit;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  background: rgba(247, 246, 243, 0.94);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(10px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #071236;
  font-weight: 800;
}

.brand-mark {
  display: block;
  width: 34px;
  height: 34px;
}

.brand-name {
  font-size: 18px;
  letter-spacing: 0;
}

.live-state,
.badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: var(--blue-bg);
  color: var(--blue-text);
}

.live-state.offline {
  background: var(--yellow-bg);
  color: var(--yellow-text);
}

.shell {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 28px 24px 40px;
}

.goal-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: end;
  padding: 8px 0 24px;
  border-bottom: 1px solid var(--line);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 10px;
  max-width: 900px;
  font-size: clamp(34px, 5vw, 68px);
  line-height: 0.95;
  letter-spacing: 0;
}

.goal-tranche {
  max-width: 860px;
  margin-bottom: 0;
  color: #2f3437;
  line-height: 1.55;
}

.goal-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(94px, auto));
  gap: 1px;
  overflow: hidden;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--line);
}

.goal-meta div {
  min-width: 0;
  padding: 12px 14px;
  background: var(--surface);
}

.goal-meta dt {
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.goal-meta dd {
  margin: 0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  padding-top: 18px;
}

.column {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-muted);
}

.column-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--line);
}

.column-header h2 {
  margin: 0 0 4px;
  font-size: 16px;
  line-height: 1.2;
}

.column-header p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
}

.column-count {
  color: var(--muted);
  font-family: "Geist Mono", "SF Mono", monospace;
  font-size: 13px;
}

.card-list {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.task-card {
  width: 100%;
  min-height: 138px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease;
  will-change: transform, opacity;
}

.task-card:hover {
  border-color: #d1d0cc;
  transform: translateY(-1px);
}

.task-card:focus-visible,
.icon-button:focus-visible {
  outline: 2px solid #2f3437;
  outline-offset: 2px;
}

.task-card.is-active {
  border-color: #a8cfe7;
  background: #fbfdfe;
}

.task-card.is-moving {
  border-color: #c2b8ff;
}

.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-id {
  color: var(--muted);
  font-family: "Geist Mono", "SF Mono", monospace;
  font-size: 12px;
}

.task-title {
  margin: 0;
  color: #2f3437;
  font-size: 15px;
  line-height: 1.35;
}

.card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.badge.status-active,
.badge.status-queued { background: var(--blue-bg); color: var(--blue-text); }
.badge.status-done { background: var(--green-bg); color: var(--green-text); }
.badge.status-blocked { background: var(--red-bg); color: var(--red-text); }
.badge.role { background: var(--yellow-bg); color: var(--yellow-text); }

.empty {
  padding: 18px;
  color: var(--muted);
  font-size: 14px;
}

@media (prefers-reduced-motion: reduce) {
  .task-card {
    transition: none;
  }
}

.modal[hidden] {
  display: none;
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 24px;
}

.modal-scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(17, 17, 17, 0.32);
}

.modal-panel {
  position: relative;
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.modal-header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.15;
  letter-spacing: 0;
}

.icon-button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: #2f3437;
  cursor: pointer;
}

.modal-body {
  display: grid;
  gap: 18px;
  padding: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--line);
}

.detail-item {
  min-width: 0;
  padding: 12px;
  background: var(--surface-muted);
}

.detail-item dt {
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-item dd {
  margin: 0;
  line-height: 1.45;
}

.detail-section {
  border-top: 1px solid var(--line);
  padding-top: 14px;
}

.detail-section h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.detail-section ul {
  margin: 0;
  padding-left: 18px;
  color: #2f3437;
  line-height: 1.55;
}

pre.note {
  overflow: auto;
  margin: 0;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--canvas);
  color: #2f3437;
  font-family: "Geist Mono", "SF Mono", monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
}

@media (max-width: 980px) {
  .goal-header {
    grid-template-columns: 1fr;
  }

  .goal-meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .board {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .topbar,
  .shell {
    padding-left: 14px;
    padding-right: 14px;
  }

  .goal-meta,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 38px;
  }
}`;
}

function boardJs() {
  return `let currentBoard = null;
let eventSource = null;

const boardEl = document.getElementById("board");
const liveStateEl = document.getElementById("live-state");
const modalEl = document.getElementById("task-modal");
const modalTitleEl = document.getElementById("modal-title");
const modalKickerEl = document.getElementById("modal-kicker");
const modalBodyEl = document.getElementById("modal-body");

document.addEventListener("click", (event) => {
  const card = event.target.closest("[data-task-id]");
  if (card) openTask(card.dataset.taskId);
  if (event.target.matches("[data-close-modal]")) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

async function loadBoard() {
  const response = await fetch("./api/board", { cache: "no-store" });
  if (!response.ok) throw new Error("Board request failed");
  renderBoard(await response.json());
}

function connectEvents() {
  eventSource = new EventSource("./events");
  eventSource.addEventListener("board", (event) => {
    setLiveState("Live", true);
    renderBoard(JSON.parse(event.data));
  });
  eventSource.addEventListener("error", () => {
    setLiveState("Reconnecting", false);
  });
}

function renderBoard(board) {
  const previousPositions = measureCards();
  const previousColumns = new Map();
  for (const column of currentBoard?.columns || []) {
    for (const task of column.tasks) previousColumns.set(task.id, column.id);
  }
  const movingTaskIds = tasksChangingColumns(board, previousColumns);
  if (movingTaskIds.size) highlightMovingCards(movingTaskIds);
  currentBoard = board;
  document.getElementById("goal-title").textContent = board.goal.title;
  document.title = board.goal.title ? board.goal.title + " - GoalBuddy Board" : "GoalBuddy Board";
  document.getElementById("goal-tranche").textContent = board.goal.tranche || "";
  document.getElementById("goal-status").textContent = board.goal.status;
  document.getElementById("goal-active").textContent = board.goal.activeTask || "None";
  document.getElementById("goal-updated").textContent = new Date(board.generatedAt).toLocaleTimeString();

  const delay = movingTaskIds.size ? 260 : 0;
  window.setTimeout(() => {
    if (board.error) {
      boardEl.replaceChildren(renderBoardError(board.error));
      return;
    }
    boardEl.replaceChildren(...board.columns.map(renderColumn));
    animateCardMoves(previousPositions, movingTaskIds);
  }, delay);
}

function renderBoardError(message) {
  const section = el("section", "column");
  const header = el("header", "column-header");
  const titleWrap = el("div");
  titleWrap.append(
    el("h2", "", "Board error"),
    el("p", "", "GoalBuddy could not parse the current board state."),
  );
  header.append(titleWrap, el("span", "badge status-blocked", "Error"));

  const list = el("div", "card-list");
  list.append(el("p", "empty", message || "Unknown board error."));

  section.append(header, list);
  return section;
}

function renderColumn(column) {
  const section = el("section", "column");
  section.dataset.columnId = column.id;
  const header = el("header", "column-header");
  const titleWrap = el("div");
  titleWrap.append(el("h2", "", column.title), el("p", "", column.description));
  header.append(titleWrap, el("span", "column-count", String(column.tasks.length)));

  const list = el("div", "card-list");
  if (column.tasks.length === 0) {
    list.append(el("p", "empty", "No cards"));
  } else {
    for (const task of column.tasks) list.append(renderCard(task));
  }

  section.append(header, list);
  return section;
}

function renderCard(task) {
  const button = el("button", \`task-card \${task.active ? "is-active" : ""}\`);
  button.type = "button";
  button.dataset.taskId = task.id;
  button.dataset.status = task.status;

  const topline = el("div", "card-topline");
  topline.append(el("span", "task-id", task.id), statusBadge(task.status));

  const footer = el("div", "card-footer");
  footer.append(el("span", "badge role", task.assignee || task.type || "PM"));
  if (task.receipt?.present) footer.append(el("span", "badge status-done", "Receipt"));

  button.append(topline, el("h3", "task-title", task.title), footer);
  return button;
}

function measureCards() {
  const positions = new Map();
  for (const card of boardEl.querySelectorAll("[data-task-id]")) {
    const rect = card.getBoundingClientRect();
    positions.set(card.dataset.taskId, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      columnId: card.closest("[data-column-id]")?.dataset.columnId || "",
    });
  }
  return positions;
}

function tasksChangingColumns(board, previousColumns) {
  const moving = new Set();
  for (const column of board.columns) {
    for (const task of column.tasks) {
      const previousColumn = previousColumns.get(task.id);
      if (previousColumn && previousColumn !== column.id) moving.add(task.id);
    }
  }
  return moving;
}

function highlightMovingCards(taskIds) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const card of boardEl.querySelectorAll("[data-task-id]")) {
    if (!taskIds.has(card.dataset.taskId)) continue;
    card.classList.add("is-moving");
    card.animate([
      { transform: "scale(1)", borderColor: "#eaeaea" },
      { transform: "scale(1.025)", borderColor: "#9d8cff" },
      { transform: "scale(1)", borderColor: "#c2b8ff" },
    ], {
      duration: 240,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    });
  }
}

function animateCardMoves(previousPositions, movingTaskIds = new Set()) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  for (const card of boardEl.querySelectorAll("[data-task-id]")) {
    const previous = previousPositions.get(card.dataset.taskId);
    const current = card.getBoundingClientRect();
    const columnId = card.closest("[data-column-id]")?.dataset.columnId || "";

    if (!previous) {
      card.animate([
        { opacity: 0, transform: "translateY(10px) scale(0.98)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ], {
        duration: 260,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
      continue;
    }

    const dx = previous.left - current.left;
    const dy = previous.top - current.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

    const changedColumn = previous.columnId !== columnId;
    const wasSelected = movingTaskIds.has(card.dataset.taskId);
    card.animate([
      {
        transform: \`translate(\${dx}px, \${dy}px) scale(\${changedColumn ? "1.015" : "1"})\`,
        opacity: changedColumn ? 0.9 : 1,
        borderColor: wasSelected ? "#9d8cff" : "#eaeaea",
      },
      {
        transform: "translate(0, 0) scale(1)",
        opacity: 1,
        borderColor: "#eaeaea",
      },
    ], {
      duration: changedColumn ? 980 : 520,
      easing: "cubic-bezier(0.19, 1, 0.22, 1)",
    });
  }
}

function openTask(taskId) {
  const task = currentBoard?.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;

  modalKickerEl.textContent = \`\${task.id} · \${task.status}\`;
  modalTitleEl.textContent = task.title;
  modalBodyEl.replaceChildren(renderTaskDetail(task));
  modalEl.hidden = false;
}

function closeModal() {
  modalEl.hidden = true;
}

function renderTaskDetail(task) {
  const root = el("div");
  const grid = el("dl", "detail-grid");
  for (const [label, value] of [
    ["Status", task.status],
    ["Assignee", task.assignee || "Unassigned"],
    ["Type", task.type],
    ["Receipt", task.receipt?.summary || "None"],
  ]) {
    const item = el("div", "detail-item");
    item.append(el("dt", "", label), el("dd", "", value));
    grid.append(item);
  }
  root.append(grid);
  root.append(detailText("Objective", task.objective));
  root.append(detailList("Inputs", task.inputs));
  root.append(detailList("Constraints", task.constraints));
  root.append(detailList("Expected Output", task.expectedOutput));
  root.append(detailList("Allowed Files", task.allowedFiles));
  root.append(detailList("Verify", task.verify));
  root.append(detailList("Stop If", task.stopIf));
  if (task.receipt?.decision) root.append(detailText("Decision", task.receipt.decision));
  if (task.receipt?.changedFiles?.length) root.append(detailList("Changed Files", task.receipt.changedFiles));
  if (task.receipt?.commands?.length) {
    root.append(detailList("Commands", task.receipt.commands.map((command) => command.status ? \`\${command.status}: \${command.cmd}\` : command.cmd)));
  }
  if (task.note?.content) {
    const section = el("section", "detail-section");
    section.append(el("h3", "", task.note.title || task.note.path), el("pre", "note", task.note.content));
    root.append(section);
  }
  return root;
}

function detailText(title, value) {
  const section = el("section", "detail-section");
  section.append(el("h3", "", title), el("p", "", value || "None"));
  return section;
}

function detailList(title, values) {
  const section = el("section", "detail-section");
  section.append(el("h3", "", title));
  if (!values?.length) {
    section.append(el("p", "", "None"));
    return section;
  }
  const list = el("ul");
  for (const value of values) list.append(el("li", "", value));
  section.append(list);
  return section;
}

function statusBadge(status) {
  const label = status === "done" ? "Completed" : status === "active" ? "Active" : status === "blocked" ? "Blocked" : "Queued";
  return el("span", \`badge status-\${status}\`, label);
}

function setLiveState(text, live) {
  liveStateEl.textContent = text;
  liveStateEl.classList.toggle("offline", !live);
}

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

loadBoard()
  .then(() => {
    setLiveState("Live", true);
    connectEvents();
  })
  .catch((error) => {
    setLiveState("Offline", false);
    boardEl.textContent = error.message;
  });
`;
}
