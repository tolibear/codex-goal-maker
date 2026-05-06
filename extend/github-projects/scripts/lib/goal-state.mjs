import { readFile } from "node:fs/promises";

const VALID_STATUSES = new Set(["queued", "active", "blocked", "done"]);
const VALID_PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);

export class GoalStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "GoalStateError";
  }
}

export async function loadGoalBoard(path) {
  const text = await readFile(path, "utf8");
  return normalizeGoalBoard(parseGoalStateText(text), path);
}

export function parseGoalStateText(text) {
  const lines = tokenizeYaml(text);
  if (!lines.length) {
    throw new GoalStateError("Goal state is empty.");
  }

  const [value, nextIndex] = parseBlock(lines, 0, lines[0].indent);
  if (nextIndex < lines.length) {
    throw new GoalStateError(`Could not parse line ${lines[nextIndex].number}.`);
  }
  return value;
}

export function normalizeGoalBoard(document, sourcePath = "<memory>") {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new GoalStateError("Goal state must be a YAML mapping.");
  }
  if (Number(document.version) !== 2) {
    throw new GoalStateError("Only Goal Maker v2 state.yaml files are supported.");
  }
  if (!document.goal || typeof document.goal !== "object") {
    throw new GoalStateError("Missing goal metadata.");
  }
  if (!Array.isArray(document.tasks) || document.tasks.length === 0) {
    throw new GoalStateError("Missing non-empty tasks list.");
  }

  const goal = document.goal;
  const tasks = document.tasks.map((task, index) => normalizeTask(task, index));
  const activeTasks = tasks.filter((task) => task.status === "active");
  if (activeTasks.length > 1) {
    throw new GoalStateError("Goal state has more than one active task.");
  }

  return {
    sourcePath,
    title: cleanText(goal.title || "Untitled goal"),
    slug: cleanText(goal.slug || "untitled-goal"),
    kind: cleanText(goal.kind || "open_ended"),
    tranche: cleanText(goal.tranche || ""),
    status: cleanText(goal.status || "active"),
    activeTask: cleanText(document.active_task || activeTasks[0]?.id || ""),
    tasks,
  };
}

function normalizeTask(task, index) {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    throw new GoalStateError(`Task ${index + 1} must be a mapping.`);
  }

  const id = cleanText(task.id);
  const status = cleanText(task.status);
  if (!id) {
    throw new GoalStateError(`Task ${index + 1} is missing id.`);
  }
  if (!VALID_STATUSES.has(status)) {
    throw new GoalStateError(`Task ${id} has unsupported status "${status}".`);
  }

  return {
    id,
    title: titleForTask(task),
    objective: cleanText(task.objective || ""),
    status,
    priority: normalizePriority(task.priority, status),
    type: cleanText(task.type || "pm"),
    assignee: cleanText(task.assignee || ""),
    receiptSummary: summarizeReceipt(task.receipt),
    allowedFiles: normalizeStringList(task.allowed_files),
    verify: normalizeStringList(task.verify),
    parentId: cleanText(task.parent || task.parent_id || ""),
    dependsOn: normalizeStringList(task.depends_on || task.blocked_by),
    updatedLabel: task.receipt ? `receipt:${cleanText(task.receipt.result || "present")}` : "receipt:none",
  };
}

function normalizePriority(priority, status) {
  const normalized = cleanText(priority).toUpperCase();
  if (normalized) {
    if (!VALID_PRIORITIES.has(normalized)) {
      throw new GoalStateError(`Unsupported priority "${priority}". Use P0, P1, P2, or P3.`);
    }
    return normalized;
  }
  if (status === "blocked") return "P0";
  if (status === "active") return "P1";
  if (status === "done") return "P3";
  return "P2";
}

function titleForTask(task) {
  const objective = cleanText(task.objective || "Untitled task");
  return objective.replace(/\.$/, "");
}

function summarizeReceipt(receipt) {
  if (!receipt) return "";
  if (typeof receipt === "string") return cleanText(receipt);
  if (Array.isArray(receipt) || typeof receipt !== "object") return cleanText(receipt);

  if (receipt.summary) return cleanText(receipt.summary);
  if (receipt.decision) return cleanText(receipt.decision);
  if (receipt.note) return `See ${cleanText(receipt.note)}`;
  if (receipt.result) return `Result: ${cleanText(receipt.result)}`;
  return "";
}

function normalizeStringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  return [cleanText(value)].filter(Boolean);
}

function cleanText(value) {
  return String(value ?? "").trim();
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
        throw new GoalStateError(`Unsupported odd indentation at line ${index + 1}.`);
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
  if (lines[index].text.startsWith("- ")) {
    return parseArray(lines, index, indent);
  }
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

      if (index < lines.length && lines[index].indent > indent) {
        const [child, nextIndex] = parseBlock(lines, index, lines[index].indent);
        if (child && typeof child === "object" && !Array.isArray(child)) {
          Object.assign(object, child);
        } else {
          throw new GoalStateError(`Expected mapping below line ${line.number}.`);
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
    throw new GoalStateError(`Expected key/value pair at line ${line.number}.`);
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
    throw new GoalStateError("Block scalar YAML is not supported by this lightweight parser.");
  }
  return text;
}

function unquote(text) {
  if (text.startsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
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
