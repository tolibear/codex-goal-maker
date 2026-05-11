import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createBoardPayload, writeBoardApp } from "../scripts/lib/goal-board.mjs";
import { parseArgs, startBoardServer } from "../scripts/local-goal-board.mjs";

test("normalizes a dense goal into local board columns", () => {
  const payload = createBoardPayload(resolve("extend/local-goal-board/examples/sample-goal"));

  assert.equal(payload.goal.title, "Local Kanban Board Extension");
  assert.equal(payload.goal.activeTask, "");
  assert.equal(payload.counts.total, 14);
  assert.equal(payload.counts.todo, 0);
  assert.equal(payload.counts.inProgress, 0);
  assert.equal(payload.counts.blocked, 5);
  assert.equal(payload.counts.completed, 9);
  assert.deepEqual(payload.columns.map((column) => column.title), ["Todo", "In Progress", "Blocked", "Completed"]);

  const scout = payload.tasks.find((task) => task.id === "T001");
  assert.equal(scout.receipt.summary, "T001 completed during the progressive board motion demo.");
});

test("writes a minimal GoalBuddy web app into the goal directory", () => {
  const appDir = writeBoardApp(resolve("extend/local-goal-board/examples/sample-goal"));
  const html = readFileSync(join(appDir, "index.html"), "utf8");
  const css = readFileSync(join(appDir, "styles.css"), "utf8");
  const js = readFileSync(join(appDir, "app.js"), "utf8");
  const logo = readFileSync(join(appDir, "goalbuddy-mark.png"));

  assert.match(html, /goalbuddy-mark\.png/);
  assert.match(css, /--canvas: #f7f6f3/);
  assert.doesNotMatch(css, /gradient/i);
  assert.match(js, /new EventSource\("\.\/events"\)/);
  assert.match(js, /animateCardMoves/);
  assert.match(js, /card\.animate/);
  assert.match(js, /highlightMovingCards/);
  assert.match(js, /duration: changedColumn \? 980 : 520/);
  assert.equal(logo.subarray(1, 4).toString("ascii"), "PNG");
});

test("parses CLI options", () => {
  assert.deepEqual(parseArgs(["--goal", "docs/goals/demo", "--port", "0", "--once", "--json"]), {
    goal: "docs/goals/demo",
    host: "127.0.0.1",
    port: 0,
    once: true,
    json: true,
  });
});

test("runs when installed under a symlinked temp path", () => {
  const root = mkdtempSync("/tmp/goalbuddy-local-board-direct-");
  try {
    cpSync("extend/local-goal-board/scripts", join(root, "scripts"), { recursive: true });
    cpSync("extend/local-goal-board/assets", join(root, "assets"), { recursive: true });

    const result = spawnSync(process.execPath, [
      join(root, "scripts", "local-goal-board.mjs"),
      "--goal",
      resolve("extend/local-goal-board/examples/sample-goal"),
      "--once",
      "--json",
    ], { encoding: "utf8" });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.board.goal.title, "Local Kanban Board Extension");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("serves board JSON and streams live state changes over SSE", async () => {
  const root = mkdtempSync(join(tmpdir(), "goalbuddy-local-board-"));
  const goalDir = join(root, "demo-goal");
  try {
    mkdirSync(join(goalDir, "notes"), { recursive: true });
    writeFileSync(join(goalDir, "state.yaml"), stateYaml("active"));
    writeFileSync(join(goalDir, "notes", "T001-note.md"), "# Live Note\n\nInitial note.\n");

    const server = await startBoardServer({ goalDir, host: "127.0.0.1", port: 0 });
    try {
      const boardResponse = await fetch(`${server.url}api/board`);
      assert.equal(boardResponse.status, 200);
      const board = await boardResponse.json();
      assert.equal(board.tasks[0].status, "active");

      const controller = new AbortController();
      const events = await fetch(`${server.url}events`, { signal: controller.signal });
      assert.equal(events.status, 200);
      const reader = events.body.getReader();

      await readUntil(reader, /"status":"active"/);
      writeFileSync(join(goalDir, "state.yaml"), stateYaml("blocked"));
      const update = await readUntil(reader, /"status":"blocked"/);
      assert.match(update, /"title":"Blocked"/);

      controller.abort();
      await reader.cancel().catch(() => {});
    } finally {
      await server.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

async function readUntil(reader, pattern) {
  const decoder = new TextDecoder();
  let text = "";
  const deadline = Date.now() + 3000;

  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (pattern.test(text)) return text;
  }

  assert.fail(`Timed out waiting for ${pattern}. Received:\n${text}`);
}

function stateYaml(status) {
  return `version: 2
goal:
  title: "Live board"
  slug: "live-board"
  kind: specific
  tranche: "Verify live updates."
  status: active
active_task: T001
tasks:
  - id: T001
    type: worker
    assignee: Worker
    status: ${status}
    objective: "Render live changes."
    receipt:
      result: done
      summary: "Rendered safely."
      note: notes/T001-note.md
`;
}
