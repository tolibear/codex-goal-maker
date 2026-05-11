#!/usr/bin/env node
import { createServer } from "node:http";
import { existsSync, readFileSync, realpathSync, watch } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createBoardPayload, writeBoardApp } from "./lib/goal-board.mjs";

const textTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
};

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
}

export async function main() {
  const options = parseArgs(process.argv.slice(2));
  const goalDir = resolve(options.goal || "");
  if (!options.goal) throw new Error("Missing --goal docs/goals/<slug>");
  if (!existsSync(join(goalDir, "state.yaml"))) {
    throw new Error(`Missing state.yaml in ${goalDir}`);
  }

  const appDir = writeBoardApp(goalDir);
  const board = createBoardPayload(goalDir);

  if (options.once) {
    if (options.json) {
      console.log(JSON.stringify({ goalDir, appDir, board }, null, 2));
    } else {
      console.log(`Generated GoalBuddy board app at ${appDir}`);
    }
    return { goalDir, appDir, board };
  }

  const server = await startBoardServer({
    goalDir,
    appDir,
    host: options.host,
    port: options.port,
  });

  if (options.json) {
    console.log(JSON.stringify({ goalDir, appDir, url: server.url }, null, 2));
  } else {
    console.log(`GoalBuddy local board: ${server.url}`);
    console.log(`Watching: ${join(goalDir, "state.yaml")}`);
    console.log("Press Ctrl-C to stop.");
  }

  return server;
}

export function parseArgs(args) {
  const options = {
    goal: "",
    host: "127.0.0.1",
    port: 41737,
    once: false,
    json: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--goal") {
      options.goal = args[++index] || "";
    } else if (arg.startsWith("--goal=")) {
      options.goal = arg.slice("--goal=".length);
    } else if (arg === "--host") {
      options.host = args[++index] || options.host;
    } else if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
    } else if (arg === "--port") {
      options.port = Number(args[++index] || options.port);
    } else if (arg.startsWith("--port=")) {
      options.port = Number(arg.slice("--port=".length));
    } else if (arg === "--once") {
      options.once = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error(`Invalid --port: ${options.port}`);
  }

  return options;
}

export async function startBoardServer({ goalDir, appDir = writeBoardApp(goalDir), host = "127.0.0.1", port = 0 }) {
  const root = resolve(goalDir);
  const clients = new Set();
  let lastPayload = safePayload(root);

  const notify = () => {
    lastPayload = safePayload(root);
    for (const client of clients) sendEvent(client, lastPayload);
  };

  const watcher = watchGoal(root, notify);
  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
    if (url.pathname === "/api/board") {
      sendJson(response, safePayload(root));
      return;
    }
    if (url.pathname === "/events") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
      response.write("retry: 1000\n\n");
      clients.add(response);
      sendEvent(response, lastPayload);
      request.on("close", () => clients.delete(response));
      return;
    }

    serveStatic(appDir, url.pathname, response);
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;

  return {
    url: `http://${host}:${actualPort}/`,
    close: () => new Promise((resolveClose, rejectClose) => {
      watcher.close();
      for (const client of clients) client.end();
      server.close((error) => error ? rejectClose(error) : resolveClose());
    }),
  };
}

function watchGoal(goalDir, onChange) {
  const watchers = [];
  const schedule = debounce(onChange, 80);
  watchers.push(watch(goalDir, { persistent: true }, (_event, filename) => {
    if (!filename) return schedule();
    if (filename === "state.yaml" || filename === "notes") schedule();
  }));
  const notesDir = join(goalDir, "notes");
  if (existsSync(notesDir)) {
    watchers.push(watch(notesDir, { persistent: true }, schedule));
  }
  return {
    close() {
      for (const watcher of watchers) watcher.close();
    },
  };
}

function safePayload(goalDir) {
  try {
    return createBoardPayload(goalDir);
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      error: error.message,
      goal: { title: "GoalBuddy Board", slug: "", status: "error", activeTask: "", tranche: "" },
      columns: [
        { id: "todo", title: "Todo", description: "Queued work ready to pull", tasks: [] },
        { id: "in-progress", title: "In Progress", description: "The active task", tasks: [] },
        { id: "blocked", title: "Blocked", description: "Needs unblock or a smaller slice", tasks: [] },
        { id: "completed", title: "Completed", description: "Receipted work", tasks: [] },
      ],
      tasks: [],
      notes: [],
    };
  }
}

function sendJson(response, payload) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendEvent(response, payload) {
  response.write(`event: board\ndata: ${JSON.stringify(payload)}\n\n`);
}

function serveStatic(appDir, pathname, response) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  if (!/^\/[A-Za-z0-9_.-]+$/.test(cleanPath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const file = join(appDir, cleanPath.slice(1));
  if (!existsSync(file)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const extension = cleanPath.match(/\.[^.]+$/)?.[0] || "";
  response.writeHead(200, {
    "Content-Type": textTypes[extension] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  response.end(readFileSync(file));
}

function debounce(fn, delay) {
  let timer = null;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

function usage() {
  console.log(`GoalBuddy Local Goal Board

Usage:
  node extend/local-goal-board/scripts/local-goal-board.mjs --goal docs/goals/<slug>
  node extend/local-goal-board/scripts/local-goal-board.mjs --goal docs/goals/<slug> --once --json

Options:
  --goal <path>   Goal directory containing state.yaml.
  --host <host>   Local server host. Default: 127.0.0.1.
  --port <port>   Local server port. Use 0 for an ephemeral port.
  --once          Generate .goalbuddy-board and exit.
  --json          Print structured output.
`);
}
