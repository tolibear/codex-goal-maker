#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, normalize, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "../..");
const skillSource = join(packageRoot, "goal-maker");
const defaultCodexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const defaultCatalogUrl = "https://raw.githubusercontent.com/tolibear/goal-maker/main/extend/catalog.json";
const requiredAgentFiles = [
  "goal_judge.toml",
  "goal_scout.toml",
  "goal_worker.toml",
];
const optionsWithValues = new Set([
  "--catalog",
  "--catalog-url",
  "--codex-home",
  "--kind",
]);

const args = process.argv.slice(2);
const command = args[0] === "--help" || args[0] === "-h"
  ? "help"
  : args[0] && !args[0].startsWith("-")
    ? args[0]
    : "install";

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  switch (command) {
    case "install":
    case "update":
      installAll();
      break;
    case "agents":
      installAgents();
      break;
    case "doctor":
      doctor();
      break;
    case "extend":
      await extend();
      break;
    case "help":
    case "--help":
    case "-h":
      usage();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      usage();
      process.exit(2);
  }
}

function optionValue(name) {
  const exact = args.indexOf(name);
  if (exact !== -1) return args[exact + 1];
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : null;
}

function hasFlag(name) {
  return args.includes(name);
}

function positional(index) {
  return positionalArgs()[index] || "";
}

function positionalArgs() {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (optionsWithValues.has(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) continue;
    values.push(arg);
  }
  return values;
}

function usage() {
  console.log(`Codex Goal Maker

Usage:
  goal-maker install [--codex-home <path>] [--force]
  goal-maker update [--codex-home <path>]
  goal-maker agents [--codex-home <path>] [--force]
  goal-maker doctor [--codex-home <path>] [--goal-ready]
  goal-maker extend [--catalog-url <url-or-path>] [--kind <kind>] [--json]
  goal-maker extend <id> [--catalog-url <url-or-path>] [--json]
  goal-maker extend install <id> [--catalog-url <url-or-path>] [--dry-run] [--force] [--json]
  goal-maker extend doctor [<id>] [--codex-home <path>] [--json]

Default:
  goal-maker  Installs the skill and bundled agent definitions.

Environment:
  CODEX_HOME                         Overrides the default ~/.codex target.
  GOAL_MAKER_EXTEND_CATALOG_URL      Overrides the default GitHub-hosted extension catalog.
`);
}

function codexHome() {
  return resolve(optionValue("--codex-home") || defaultCodexHome);
}

function installSkill({ force = true } = {}) {
  const target = installedSkillRoot();
  if (!existsSync(skillSource)) {
    console.error(`Skill payload not found: ${skillSource}`);
    process.exit(1);
  }

  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) {
    if (!force) {
      console.error(`Refusing to overwrite existing skill: ${target}`);
      console.error("Use --force to overwrite.");
      process.exit(1);
    }
    rmSync(target, { recursive: true, force: true });
  }

  cpSync(skillSource, target, {
    recursive: true,
  });
  console.log(`Installed Codex Goal Maker skill to ${target}`);
}

function installAgents() {
  const source = join(skillSource, "agents");
  const target = join(codexHome(), "agents");
  const force = hasFlag("--force") || command === "update" || command === "install";
  mkdirSync(target, { recursive: true });

  for (const file of readdirSync(source)) {
    if (!file.startsWith("goal_") || !file.endsWith(".toml")) continue;
    const dest = join(target, file);
    if (existsSync(dest) && !force) {
      console.log(`skip existing ${dest} (use --force to overwrite)`);
      continue;
    }
    cpSync(join(source, file), dest);
    console.log(`installed ${dest}`);
  }
}

function installAll() {
  installSkill({ force: true });
  installAgents();
}

function doctor() {
  const skillPath = join(installedSkillRoot(), "SKILL.md");
  const agentsPath = join(codexHome(), "agents");
  const installed = existsSync(skillPath);
  const agents = existsSync(agentsPath)
    ? readdirSync(agentsPath).filter((file) => file.startsWith("goal_") && file.endsWith(".toml"))
    : [];
  const missingAgents = requiredAgentFiles.filter((file) => !agents.includes(file));
  const staleAgents = requiredAgentFiles.filter((file) => {
    const installedAgent = join(agentsPath, file);
    const bundledAgent = join(skillSource, "agents", file);
    if (!existsSync(installedAgent) || !existsSync(bundledAgent)) return false;
    return sha256(readFileSync(installedAgent)) !== sha256(readFileSync(bundledAgent));
  });
  const goalRuntime = codexGoalRuntimeStatus();
  const warnings = [];
  if (!goalRuntime.ready) {
    warnings.push("native Codex /goal runtime is not ready; run `codex login` and `codex features enable goals` before using /goal.");
  }

  console.log(JSON.stringify({
    codex_home: codexHome(),
    skill_installed: installed,
    skill_path: skillPath,
    installed_agents: agents,
    missing_agents: missingAgents,
    stale_agents: staleAgents,
    goal_runtime: goalRuntime,
    warnings,
  }, null, 2));

  const installOk = installed && missingAgents.length === 0 && staleAgents.length === 0;
  const goalReadyOk = !hasFlag("--goal-ready") || goalRuntime.ready;
  process.exit(installOk && goalReadyOk ? 0 : 1);
}

function codexGoalRuntimeStatus() {
  const version = runCodex(["--version"]);
  const login = version.ok ? runCodex(["login", "status"]) : { ok: false, stdout: "", stderr: "codex CLI unavailable" };
  const features = version.ok ? runCodex(["features", "list"]) : { ok: false, stdout: "", stderr: "codex CLI unavailable" };
  const goalFeature = parseGoalFeature(features.stdout);
  const loggedIn = login.ok && !/not logged in/i.test(`${login.stdout}\n${login.stderr}`);

  return {
    codex_cli_available: version.ok,
    codex_version: firstLine(version.stdout),
    logged_in: loggedIn,
    login_status: firstLine(login.stdout || login.stderr),
    goals_feature_enabled: goalFeature.enabled,
    goals_feature_stage: goalFeature.stage,
    ready: version.ok && loggedIn && goalFeature.enabled,
  };
}

function runCodex(args) {
  const result = spawnSync("codex", args, {
    encoding: "utf8",
    env: { ...process.env, CODEX_HOME: codexHome() },
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function parseGoalFeature(output) {
  const line = output.split(/\r?\n/).find((candidate) => candidate.trim().startsWith("goals"));
  if (!line) return { enabled: false, stage: "" };
  const parts = line.trim().split(/\s{2,}/);
  return {
    enabled: parts.at(-1) === "true",
    stage: parts.slice(1, -1).join(" "),
  };
}

function firstLine(value) {
  return (value || "").split(/\r?\n/).find((line) => line.trim())?.trim() || "";
}

async function extend() {
  if (args.includes("--help") || args.includes("-h")) {
    extendUsage();
    return;
  }

  const subcommand = positional(1) || "";
  switch (subcommand) {
    case "":
      await extendCatalog();
      break;
    case "install":
      await extendInstall();
      break;
    case "doctor":
      extendDoctor();
      break;
    case "help":
    case "--help":
    case "-h":
      extendUsage();
      break;
    default:
      await extendDetails(subcommand);
  }
}

function extendUsage() {
  console.log(`Goal Maker Extend

Usage:
  goal-maker extend [--catalog-url <url-or-path>] [--kind <kind>] [--json]
  goal-maker extend <id> [--catalog-url <url-or-path>] [--json]
  goal-maker extend install <id> [--catalog-url <url-or-path>] [--dry-run] [--force] [--json]
  goal-maker extend doctor [<id>] [--codex-home <path>] [--json]

States:
  available   Listed in the catalog.
  installed   Copied into the local Goal Maker skill install.
  enabled     Allowed by a goal or task. Not implemented by this command yet.
  configured  Required local env/provider settings are present.

Catalog:
  Defaults to ${defaultCatalogUrl}
  Override with --catalog-url or GOAL_MAKER_EXTEND_CATALOG_URL.
`);
}

async function extendCatalog() {
  const catalog = await loadCatalog();
  const kind = optionValue("--kind");
  const extensions = catalog.extensions
    .filter((extension) => !kind || extension.kind === kind)
    .map(extensionWithLocalState);

  if (hasFlag("--json")) {
    printJson({ catalog_url: catalog.url, extensions });
    return;
  }

  console.log(`Extensions from ${catalog.url}`);
  if (extensions.length === 0) {
    console.log(kind ? `No ${kind} extensions found.` : "No extensions found.");
    return;
  }
  for (const extension of extensions) {
    const state = extension.state.installed
      ? extension.state.configured ? "installed/configured" : "installed/unconfigured"
      : "available";
    console.log(`${extension.id}\t${extension.kind}\t${state}\t${extension.name || extension.summary || ""}`);
  }
}

async function extendDetails(id) {
  const catalog = await loadCatalog();
  const extension = findCatalogExtension(catalog, id);
  const detailed = extensionWithLocalState(extension);

  if (hasFlag("--json")) {
    printJson({ catalog_url: catalog.url, extension: detailed });
    return;
  }

  console.log(`${extension.id} (${extension.kind})`);
  console.log(extension.name || extension.summary || "");
  if (extension.summary && extension.summary !== extension.name) console.log(extension.summary);
  if (extension.version) console.log(`version: ${extension.version}`);
  if (extension.source) console.log(`source: ${extension.source}`);
  if (extension.auth?.env?.length) console.log(`auth env: ${extension.auth.env.join(", ")}`);
  if (extension.files?.length) console.log(`files: ${extension.files.length}`);
  if (extension.docs) console.log(`docs: ${extension.docs}`);
  console.log(`state: ${detailed.state.installed ? "installed" : "available"}${detailed.state.configured ? ", configured" : ""}`);
  if (!detailed.state.configured && detailed.state.missing_env.length) {
    console.log(`missing env: ${detailed.state.missing_env.join(", ")}`);
  }
}

async function extendInstall() {
  const id = positional(2);
  if (!id) throw new Error("Missing extension id. Usage: goal-maker extend install <id>");
  const catalog = await loadCatalog();
  const extension = findCatalogExtension(catalog, id);
  const target = extensionTarget(extension.id);
  const plan = installPlan(catalog, extension, target);

  if (hasFlag("--dry-run")) {
    if (hasFlag("--json")) {
      printJson({ dry_run: true, extension: extensionWithLocalState(extension), target, files: plan });
    } else {
      console.log(`Would install ${extension.id} to ${target}`);
      for (const file of plan) console.log(`  ${file.path}`);
    }
    return;
  }

  assertSkillInstalledForExtensionInstall();
  if (existsSync(target) && !hasFlag("--force")) {
    throw new Error(`Extension already installed: ${target}. Use --force to overwrite.`);
  }

  const temp = `${target}.tmp-${process.pid}-${Date.now()}`;
  rmSync(temp, { recursive: true, force: true });
  mkdirSync(temp, { recursive: true });

  try {
    for (const file of plan) {
      const content = await readResource(file.url);
      const actualSha = sha256(content);
      if (actualSha !== file.sha256) {
        throw new Error(`Checksum mismatch for ${file.path}: expected ${file.sha256}, got ${actualSha}`);
      }
      const destination = join(temp, file.path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, content);
    }

    writeFileSync(join(temp, ".installed.json"), `${JSON.stringify({
      id: extension.id,
      version: extension.version || "",
      kind: extension.kind,
      catalog_url: catalog.url,
      installed_at: new Date().toISOString(),
      manifest: publicExtension(extension),
      files: plan.map(({ path, sha256: digest }) => ({ path, sha256: digest })),
    }, null, 2)}\n`);

    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    renameSync(temp, target);
  } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    throw error;
  }

  if (hasFlag("--json")) {
    printJson({ installed: true, extension: extension.id, target });
  } else {
    console.log(`Installed ${extension.id} to ${target}`);
  }
}

function extendDoctor() {
  const id = positional(2);
  const targets = installedExtensions().filter((extension) => !id || extension.id === id);
  if (id && targets.length === 0) throw new Error(`Extension is not installed: ${id}`);

  const reports = targets.map(doctorInstalledExtension);
  const ok = reports.every((report) => report.ok);

  if (hasFlag("--json")) {
    printJson({ ok, extensions: reports });
  } else if (reports.length === 0) {
    console.log("No extensions installed.");
  } else {
    for (const report of reports) {
      console.log(`${report.ok ? "ok" : "not ok"}\t${report.id}`);
      for (const issue of report.issues) console.log(`  - ${issue}`);
    }
  }

  process.exit(ok ? 0 : 1);
}

function installedSkillRoot() {
  return join(codexHome(), "skills", "goal-maker");
}

function extendRoot() {
  return join(installedSkillRoot(), "extend");
}

function extensionTarget(id) {
  return join(extendRoot(), id);
}

function catalogUrl() {
  return optionValue("--catalog-url")
    || optionValue("--catalog")
    || process.env.GOAL_MAKER_EXTEND_CATALOG_URL
    || defaultCatalogUrl;
}

async function loadCatalog() {
  const url = catalogUrl();
  const text = await readResource(url);
  const catalog = JSON.parse(text);
  if (!Array.isArray(catalog.extensions)) {
    throw new Error("Extension catalog must contain an extensions array.");
  }
  return { ...catalog, url };
}

function findCatalogExtension(catalog, id) {
  const extension = catalog.extensions.find((candidate) => candidate.id === id);
  if (!extension) throw new Error(`Extension not found in catalog: ${id}`);
  validateCatalogExtension(extension);
  return extension;
}

function validateCatalogExtension(extension) {
  if (!extension.id || !/^[a-z0-9][a-z0-9-]*$/.test(extension.id)) {
    throw new Error(`Invalid extension id: ${extension.id || "<missing>"}`);
  }
  if (!extension.kind) throw new Error(`Extension ${extension.id} missing kind.`);
  if (!Array.isArray(extension.files) || extension.files.length === 0) {
    throw new Error(`Extension ${extension.id} must list files.`);
  }
  for (const file of extension.files) {
    validateCatalogFile(extension, file);
  }
}

function validateCatalogFile(extension, file) {
  if (!file.path) throw new Error(`Extension ${extension.id} has a file without path.`);
  if (!file.url) throw new Error(`Extension ${extension.id} file ${file.path} missing url.`);
  if (!/^[a-f0-9]{64}$/i.test(file.sha256 || "")) {
    throw new Error(`Extension ${extension.id} file ${file.path} must include sha256.`);
  }
  safeRelativePath(file.path);
}

function installPlan(catalog, extension, target) {
  return extension.files.map((file) => ({
    path: safeRelativePath(file.path),
    url: resolveResourceUrl(catalog.url, file.url),
    sha256: file.sha256.toLowerCase(),
    target: join(target, safeRelativePath(file.path)),
  }));
}

function safeRelativePath(path) {
  const normalized = normalize(path).replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("../") || normalized === ".." || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Unsafe extension file path: ${path}`);
  }
  return normalized;
}

function resolveResourceUrl(base, value) {
  if (/^https?:\/\//.test(value) || value.startsWith("file://") || value.startsWith("/")) return value;
  if (/^https?:\/\//.test(base) || base.startsWith("file://")) {
    return new URL(value, base).href;
  }
  return resolve(dirname(resolve(base)), value);
}

async function readResource(location) {
  if (/^https?:\/\//.test(location)) {
    if (!globalThis.fetch) throw new Error("This Node runtime does not provide fetch.");
    const response = await globalThis.fetch(location);
    if (!response.ok) throw new Error(`Failed to fetch ${location}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  const path = location.startsWith("file://") ? fileURLToPath(location) : resolve(location);
  return readFileSync(path);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function assertSkillInstalledForExtensionInstall() {
  if (!existsSync(join(installedSkillRoot(), "SKILL.md"))) {
    throw new Error(`Goal Maker skill is not installed at ${installedSkillRoot()}. Run: npx goal-maker`);
  }
}

function installedExtensions() {
  const root = extendRoot();
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readInstalledExtension(join(root, entry.name)))
    .filter(Boolean);
}

function readInstalledExtension(path) {
  const installedPath = join(path, ".installed.json");
  if (!existsSync(installedPath)) {
    return { id: basename(path), path, issues: ["missing .installed.json"] };
  }
  const data = JSON.parse(readFileSync(installedPath, "utf8"));
  return {
    ...data,
    path,
  };
}

function doctorInstalledExtension(extension) {
  const issues = [];
  for (const file of extension.files || []) {
    const path = join(extension.path, safeRelativePath(file.path));
    if (!existsSync(path)) {
      issues.push(`missing file: ${file.path}`);
      continue;
    }
    const actualSha = sha256(readFileSync(path));
    if (actualSha !== file.sha256) {
      issues.push(`checksum mismatch: ${file.path}`);
    }
  }
  for (const envName of extension.manifest?.auth?.env || []) {
    if (!process.env[envName]) issues.push(`missing env: ${envName}`);
  }

  return {
    id: extension.id,
    version: extension.version || "",
    kind: extension.kind || "",
    path: extension.path,
    ok: issues.length === 0,
    issues,
  };
}

function publicExtension(extension) {
  return {
    id: extension.id,
    name: extension.name || "",
    kind: extension.kind || "",
    version: extension.version || "",
    summary: extension.summary || "",
    description: extension.description || "",
    source: extension.source || "",
    docs: extension.docs || "",
    applies_to: extension.applies_to || {},
    reads: extension.reads || [],
    writes: extension.writes || [],
    side_effects: extension.side_effects || [],
    auth: extension.auth || { env: [] },
    supports: extension.supports || {},
    source_of_truth: extension.source_of_truth || "local",
    files: (extension.files || []).map((file) => ({
      path: file.path,
      sha256: file.sha256,
    })),
  };
}

function extensionWithLocalState(extension) {
  return {
    ...publicExtension(extension),
    state: {
      available: true,
      installed: existsSync(extensionTarget(extension.id)),
      enabled: false,
      configured: configuredFor(extension),
      missing_env: missingEnv(extension),
    },
  };
}

function configuredFor(extension) {
  return missingEnv(extension).length === 0;
}

function missingEnv(extension) {
  return (extension.auth?.env || []).filter((envName) => !process.env[envName]);
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}
