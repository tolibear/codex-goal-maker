import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GoalStateError, normalizeGoalBoard, parseGoalStateText } from "../scripts/lib/goal-state.mjs";
import {
  GITHUB_PROJECT_FIELDS,
  buildDraftIssueBody,
  buildFieldUpdates,
  ensureGoalBoardView,
  planGitHubProjectSync,
  priorityForTask,
  projectStatusForTask,
  workTypeForTask,
} from "../scripts/lib/github-projects.mjs";

describe("goal state parsing", () => {
  it("normalizes a Goal Maker v2 board", async () => {
    const text = await readFile(resolve("extend/github-projects/examples/goal-board-sync/state.yaml"), "utf8");
    const board = normalizeGoalBoard(parseGoalStateText(text));

    assert.equal(board.title, "Goal board sync MVP");
    assert.equal(board.activeTask, "T002");
    assert.equal(board.tasks.length, 3);
    assert.equal(board.tasks[0].title, "Map external board API requirements");
    assert.equal(board.tasks[1].priority, "P1");
    assert.equal(board.tasks[0].receiptSummary, "The board sync can read Goal Maker state.yaml and mirror tasks into an external board.");
    assert.equal(board.tasks[1].parentId, "T001");
    assert.deepEqual(board.tasks[1].dependsOn, ["T001"]);
    assert.deepEqual(board.tasks[1].verify, [
      "node --test extend/github-projects/test/*.test.mjs",
      "node extend/github-projects/scripts/sync-github-project.mjs --state extend/github-projects/examples/goal-board-sync/state.yaml --dry-run",
    ]);
  });

  it("rejects malformed task status", () => {
    const parsed = parseGoalStateText(`
version: 2
goal:
  title: "Bad board"
  slug: "bad-board"
tasks:
  - id: T001
    status: moving
    objective: "Bad status"
`);

    assert.throws(() => normalizeGoalBoard(parsed), GoalStateError);
  });
});

describe("GitHub Projects mapping", () => {
  it("plans GitHub draft issue creates and updates by task id", () => {
    const tasks = [
      {
        id: "T001",
        title: "T001: Existing",
        objective: "Existing",
        status: "done",
        type: "scout",
        assignee: "Scout",
        receiptSummary: "Done",
        verify: [],
        allowedFiles: [],
        updatedLabel: "receipt:done",
      },
      {
        id: "T002",
        title: "T002: New",
        objective: "New",
        status: "queued",
        type: "worker",
        assignee: "Worker",
        receiptSummary: "",
        verify: [],
        allowedFiles: [],
        updatedLabel: "receipt:none",
      },
    ];

    const operations = planGitHubProjectSync(tasks, [
      {
        id: "PVTI_existing",
        taskId: { text: "T001" },
        content: { __typename: "DraftIssue", id: "DI_existing" },
      },
    ]);

    assert.equal(operations[0].type, "update");
    assert.equal(operations[0].itemId, "PVTI_existing");
    assert.equal(operations[0].draftIssueId, "DI_existing");
    assert.equal(operations[1].type, "create");
  });

  it("builds GitHub field updates for text and single-select fields", () => {
    const fields = {
      taskId: { id: "F_task" },
      status: { id: "F_status", name: GITHUB_PROJECT_FIELDS.status, options: [{ id: "O_progress", name: "In Progress" }] },
      priority: { id: "F_priority", name: GITHUB_PROJECT_FIELDS.priority, options: [{ id: "O_p1", name: "P1" }] },
      workType: { id: "F_type", name: GITHUB_PROJECT_FIELDS.workType, options: [{ id: "O_execution", name: "Execution" }] },
      owner: { id: "F_owner" },
      parentId: { id: "F_parent" },
      dependsOn: { id: "F_depends" },
      receiptSummary: { id: "F_receipt" },
      verify: { id: "F_verify" },
      allowedFiles: { id: "F_allowed" },
      updated: { id: "F_updated" },
    };
    const task = {
      id: "T002",
      status: "active",
      type: "worker",
      assignee: "Worker",
      receiptSummary: "",
      verify: ["npm test"],
      allowedFiles: ["scripts/**"],
      parentId: "T001",
      dependsOn: ["T001"],
      updatedLabel: "receipt:none",
    };

    const updates = buildFieldUpdates(task, fields);
    assert.equal(updates.length, 11);
    assert.deepEqual(updates.find((update) => update.fieldId === "F_status").value, {
      singleSelectOptionId: "O_progress",
    });
    assert.deepEqual(updates.find((update) => update.fieldId === "F_task").value, {
      text: "T002",
    });
    assert.deepEqual(updates.find((update) => update.fieldId === "F_parent").value, { text: "T001" });
    assert.deepEqual(updates.find((update) => update.fieldId === "F_depends").value, { text: "T001" });
  });

  it("builds a draft issue body that points back to the state file", () => {
    const body = buildDraftIssueBody(
      {
        id: "T002",
        objective: "Run sync.",
        status: "active",
        type: "worker",
        assignee: "Worker",
        receiptSummary: "",
        verify: ["npm test"],
        allowedFiles: ["scripts/**"],
        parentId: "T001",
        dependsOn: ["T001"],
      },
      {
        sourcePath: "extend/github-projects/examples/goal-board-sync/state.yaml",
      }
    );

    assert.match(body, /YAML remains the source of truth/);
    assert.match(body, /Task ID: T002/);
    assert.match(body, /Parent: T001/);
    assert.match(body, /Depends on:/);
    assert.match(body, /extend\/github-projects\/examples\/goal-board-sync\/state\.yaml/);
  });

  it("creates a GitHub Board view with visible fields when missing", async () => {
    const restCalls = [];
    const view = await ensureGoalBoardView({
      client: {
        rest: async (path, options) => {
          restCalls.push({ path, options });
          return { html_url: "https://github.com/users/example/projects/1/views/2" };
        },
      },
      project: {
        number: 1,
        owner: { __typename: "User", login: "example" },
        views: { nodes: [] },
      },
      fields: {
        taskId: { databaseId: 1 },
        status: { databaseId: 2 },
        priority: { databaseId: 3 },
        workType: { databaseId: 4 },
        owner: { databaseId: 5 },
        receiptSummary: { databaseId: 6 },
        verify: { databaseId: 7 },
        allowedFiles: { databaseId: 8 },
        updated: { databaseId: 9 },
      },
    });

    assert.equal(view.html_url, "https://github.com/users/example/projects/1/views/2");
    assert.equal(restCalls[0].path, "users/example/projectsV2/1/views");
    assert.equal(restCalls[0].options.body.layout, "board");
    assert.deepEqual(restCalls[0].options.body.visible_fields, [3, 2, 4, 5]);
  });

  it("maps Goal Maker task statuses to native GitHub board statuses", () => {
    assert.equal(projectStatusForTask("queued"), "Todo");
    assert.equal(projectStatusForTask("active"), "In Progress");
    assert.equal(projectStatusForTask("blocked"), "Blocked");
    assert.equal(projectStatusForTask("done"), "Done");
  });

  it("maps Goal Maker task types and priorities to lean PM fields", () => {
    assert.equal(workTypeForTask("scout"), "Discovery");
    assert.equal(workTypeForTask("judge"), "Decision");
    assert.equal(workTypeForTask("worker"), "Execution");
    assert.equal(priorityForTask({ status: "blocked", type: "worker" }), "P0");
    assert.equal(priorityForTask({ status: "active", type: "worker" }), "P1");
    assert.equal(priorityForTask({ status: "queued", type: "scout" }), "P2");
    assert.equal(priorityForTask({ status: "done", type: "worker" }), "P3");
    assert.equal(priorityForTask({ status: "queued", type: "scout", priority: "P0" }), "P0");
  });
});
