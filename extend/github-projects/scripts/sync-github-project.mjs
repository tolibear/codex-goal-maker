#!/usr/bin/env node
import { resolve } from "node:path";
import { loadGoalBoard } from "./lib/goal-state.mjs";
import {
  GITHUB_PROJECT_FIELDS,
  GitHubProjectsClient,
  dryRunGitHubOperations,
  ensureGoalBoardView,
  ensureGoalProjectFields,
  executeGitHubProjectSync,
  loadProject,
} from "./lib/github-projects.mjs";

main().catch((error) => {
  console.error(`GitHub project sync failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }
  if (!options.state) {
    throw new Error("Missing --state docs/goals/<slug>/state.yaml.");
  }

  const board = await loadGoalBoard(resolve(options.state));
  board.sourcePath = options.state;
  board.json = options.json;

  if (options.dryRun) {
    printDryRun(board);
    return;
  }

  const projectRef = resolveProjectRef(options);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN or GH_TOKEN. Use --dry-run to validate without GitHub credentials.");
  }

  const client = new GitHubProjectsClient({ token });
  const project = await loadProject({
    client,
    projectId: projectRef.projectId,
    owner: projectRef.owner,
    number: projectRef.number,
  });
  const fields = await ensureGoalProjectFields(client, project);
  const boardView = await ensureGoalBoardView({ client, project, fields });
  const operations = await executeGitHubProjectSync({
    client,
    project,
    fields,
    tasks: board.tasks,
    board,
  });

  const created = operations.filter((operation) => operation.type === "create").length;
  const updated = operations.filter((operation) => operation.type === "update").length;
  console.log(`Synced ${board.tasks.length} tasks to GitHub Project "${project.title}": ${created} created, ${updated} updated.`);
  const boardUrl = boardView.html_url || (project.url && boardView.number ? `${project.url}/views/${boardView.number}` : "");
  if (boardUrl) {
    console.log(`Board view: ${boardUrl}`);
  }
  if (project.url) {
    console.log(project.url);
  }
}

function parseArgs(args) {
  const options = {
    state: "",
    projectId: process.env.GITHUB_PROJECT_ID || "",
    owner: process.env.GITHUB_PROJECT_OWNER || "",
    number: process.env.GITHUB_PROJECT_NUMBER || "",
    dryRun: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--state") {
      options.state = args[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--state=")) {
      options.state = arg.slice("--state=".length);
    } else if (arg === "--project-id") {
      options.projectId = args[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--project-id=")) {
      options.projectId = arg.slice("--project-id=".length);
    } else if (arg === "--owner") {
      options.owner = args[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--owner=")) {
      options.owner = arg.slice("--owner=".length);
    } else if (arg === "--project-number") {
      options.number = args[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--project-number=")) {
      options.number = arg.slice("--project-number=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function resolveProjectRef(options) {
  if (options.projectId) {
    return { projectId: options.projectId };
  }

  if (!options.owner || !options.number) {
    throw new Error("Missing GitHub Project target. Set --project-id or --owner plus --project-number.");
  }

  const number = Number(options.number);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error("--project-number must be a positive integer.");
  }

  return {
    owner: options.owner,
    number,
  };
}

function printUsage() {
  console.log(`Usage:
  node extend/github-projects/scripts/sync-github-project.mjs --state docs/goals/<slug>/state.yaml --owner <login> --project-number <number>
  node extend/github-projects/scripts/sync-github-project.mjs --state docs/goals/<slug>/state.yaml --project-id <project-node-id>
  node extend/github-projects/scripts/sync-github-project.mjs --state docs/goals/<slug>/state.yaml --dry-run
  node extend/github-projects/scripts/sync-github-project.mjs --state docs/goals/<slug>/state.yaml --dry-run --json

Environment:
  GITHUB_TOKEN or GH_TOKEN       Required unless --dry-run is used.
  GITHUB_PROJECT_ID              Optional ProjectV2 node ID.
  GITHUB_PROJECT_OWNER           Optional user/org login.
  GITHUB_PROJECT_NUMBER          Optional project number.
`);
}

function printDryRun(board) {
  if (board.json) {
    console.log(JSON.stringify({
      dry_run: true,
      source: board.sourcePath,
      title: board.title,
      slug: board.slug,
      fields: Object.values(GITHUB_PROJECT_FIELDS),
      view: "Goal Board",
      status_mapping: {
        queued: "Todo",
        active: "In Progress",
        blocked: "Blocked",
        done: "Done",
      },
      operations: dryRunGitHubOperations(board),
    }, null, 2));
    return;
  }

  console.log(`Dry run for ${board.title} (${board.slug})`);
  console.log(`Source: ${board.sourcePath}`);
  console.log("GitHub Project fields that will be ensured: Task ID, Status, Priority, Work Type, Owner, Parent ID, Depends On, Receipt Summary, Verify, Allowed Files, Goal Updated");
  console.log("GitHub Project view that will be ensured: Goal Board (Board layout)");
  console.log("Status mapping: queued -> Todo, active -> In Progress, blocked -> Blocked, done -> Done");
  for (const operation of dryRunGitHubOperations(board)) {
    console.log(`UPSERT ${operation.taskId} ${operation.status} -> ${operation.projectStatus} ${operation.priority} ${operation.typeLabel} ${operation.title}`);
  }
  console.log(`Planned ${board.tasks.length} draft issue upserts. GitHub was not called.`);
}
