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
const canonicalProductName = "GoalBuddy";
const canonicalCliName = "goalbuddy";
const pluginName = "goalbuddy";
const canonicalSkillName = "goal-prep";
const canonicalSkillDirectory = "goalbuddy";
const legacyCliName = "goal-maker";
const legacySkillName = "goal-maker";
const skillSource = join(packageRoot, canonicalSkillDirectory);
const packageInfo = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
const defaultCodexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const defaultCatalogUrl = "https://raw.githubusercontent.com/tolibear/goalbuddy/main/extend/catalog.json";
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
  "--source",
]);

const args = process.argv.slice(2);
const command = args[0] === "--help" || args[0] === "-h"
  ? "help"
  : args[0] && !args[0].startsWith("-")
    ? args[0]
    : "default";
const invokedAs = invokedCommandName();

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  maybePrintLegacyNotice();
  switch (command) {
    case "default":
      installPlugin();
      break;
    case "install":
    case "update":
      await installAll();
      break;
    case "agents":
      installAgents();
      break;
    case "doctor":
      doctor();
      break;
    case "check-update":
    case "update-check":
      checkUpdate();
      break;
    case "plugin":
      plugin();
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

function invokedCommandName() {
  if (process.env.GOALBUDDY_INVOKED_AS) return process.env.GOALBUDDY_INVOKED_AS;
  return basename(process.argv[1] || "");
}

function invokedThroughLegacyName() {
  return invokedAs === legacyCliName;
}

function maybePrintLegacyNotice() {
  if (!invokedThroughLegacyName() || hasFlag("--json")) return;
  console.error(`${legacyCliName} has been rebranded to ${canonicalCliName}.`);
  console.error(`Use: npx ${canonicalCliName}`);
  console.error(`${legacyCliName} remains available temporarily for compatibility.`);
  console.error("");
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
  console.log(`Codex ${canonicalProductName}

Usage:
  ${canonicalCliName} [--codex-home <path>] [--json]
  ${canonicalCliName} plugin install [--source <marketplace-source>] [--codex-home <path>] [--json]
  ${canonicalCliName} install [--codex-home <path>] [--force] [--json]
  ${canonicalCliName} update [--codex-home <path>] [--json]
  ${canonicalCliName} agents [--codex-home <path>] [--force]
  ${canonicalCliName} doctor [--codex-home <path>] [--goal-ready]
  ${canonicalCliName} check-update [--json]
  ${canonicalCliName} extend [--catalog-url <url-or-path>] [--kind <kind>] [--json]
  ${canonicalCliName} extend <id> [--catalog-url <url-or-path>] [--json]
  ${canonicalCliName} extend install <id> [--catalog-url <url-or-path>] [--dry-run] [--force] [--json]
  ${canonicalCliName} extend install --all [--catalog-url <url-or-path>] [--dry-run] [--force] [--json]
  ${canonicalCliName} extend doctor [<id>] [--codex-home <path>] [--json]

Default:
  ${canonicalCliName}  Installs and enables the native Codex plugin.

Skill-only fallback:
  ${canonicalCliName} install  Installs the legacy skill payload and bundled agent definitions.

Compatibility:
  ${legacyCliName} remains a temporary alias and prints the new npx command for human-facing use.

Environment:
  CODEX_HOME                         Overrides the default ~/.codex target.
  GOALBUDDY_EXTEND_CATALOG_URL       Overrides the default GitHub-hosted extension catalog.
  GOAL_MAKER_EXTEND_CATALOG_URL      Legacy fallback for the extension catalog.
`);
}

function codexHome() {
  return resolve(optionValue("--codex-home") || defaultCodexHome);
}

function installSkill({ force = true, quiet = false } = {}) {
  const target = installedSkillRoot();
  const legacyTarget = legacyInstalledSkillRoot();
  if (!existsSync(skillSource)) {
    console.error(`Skill payload not found: ${skillSource}`);
    process.exit(1);
  }

  const previousMetadata = readInstallMetadata(target) || readInstallMetadata(legacyTarget);
  const previousFingerprint = existsSync(target) ? directoryFingerprint(target, { exclude: installFingerprintExcludes() }) : "";
  const preservedExtensions = preserveInstalledExtensions([target, legacyTarget]);
  const extensionTempPath = preservedExtensions.tempPath;
  const preservedExtensionIds = preservedExtensions.ids;

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
  restoreInstalledExtensions(target, extensionTempPath);
  writeInstallMetadata(target, previousMetadata);

  mkdirSync(dirname(legacyTarget), { recursive: true });
  rmSync(legacyTarget, { recursive: true, force: true });
  mkdirSync(legacyTarget, { recursive: true });
  writeFileSync(join(legacyTarget, "SKILL.md"), compatibilitySkillBody());
  restoreInstalledExtensions(legacyTarget, extensionTempPath);
  writeInstallMetadata(legacyTarget, previousMetadata);
  cleanupPreservedExtensions([extensionTempPath]);

  const currentFingerprint = directoryFingerprint(target, { exclude: installFingerprintExcludes() });
  const status = previousFingerprint
    ? previousFingerprint === currentFingerprint ? "unchanged" : "updated"
    : "installed";
  if (!quiet) console.log(`Installed Codex ${canonicalProductName} skill to ${target}`);

  return {
    status,
    path: target,
    compatibility_path: legacyTarget,
    previous_version: previousMetadata?.package_version || "",
    current_version: packageInfo.version,
    preserved_extensions: preservedExtensionIds,
  };
}

function compatibilitySkillBody() {
  return `---
name: ${legacySkillName}
description: Compatibility alias for GoalBuddy. Use $${canonicalSkillName} as the canonical skill.
---

# GoalBuddy Compatibility Alias

$${legacySkillName} is the previous name for $${canonicalSkillName}.

Use $${canonicalSkillName} for new work. This compatibility skill exists so older prompts and local installs do not fail after the rebrand.

When invoked through $${legacySkillName}:

1. Tell the user Goal Maker has been rebranded to GoalBuddy.
2. Show the canonical command: $${canonicalSkillName}.
3. If the user wants to continue immediately, follow the same workflow as $${canonicalSkillName}: run diagnostic intake, create or repair \`docs/goals/<slug>/goal.md\` and \`state.yaml\`, preserve one active task, and print \`/goal Follow docs/goals/<slug>/goal.md.\` without starting \`/goal\` automatically.

This alias has the same invocation boundary as \`$${canonicalSkillName}\`: prepare the board only. Do not use or refresh named skills, inspect implementation files, browse references, research, generate assets, or perform the requested work until the user starts the printed \`/goal\` command.
`;
}

function installAgents({ quiet = false } = {}) {
  const source = join(skillSource, "agents");
  const target = join(codexHome(), "agents");
  const force = hasFlag("--force") || command === "update" || command === "install";
  mkdirSync(target, { recursive: true });

  const results = [];
  for (const file of readdirSync(source)) {
    if (!file.startsWith("goal_") || !file.endsWith(".toml")) continue;
    const dest = join(target, file);
    const sourceHash = sha256(readFileSync(join(source, file)));
    const previousHash = existsSync(dest) ? sha256(readFileSync(dest)) : "";
    if (existsSync(dest) && !force) {
      if (!quiet) console.log(`skip existing ${dest} (use --force to overwrite)`);
      results.push({ file, status: "skipped", path: dest });
      continue;
    }
    cpSync(join(source, file), dest);
    const status = previousHash ? previousHash === sourceHash ? "unchanged" : "updated" : "installed";
    if (!quiet) console.log(`installed ${dest}`);
    results.push({ file, status, path: dest });
  }
  return results;
}

async function installAll() {
  const quiet = true;
  const report = {
    command,
    package: {
      name: packageInfo.name,
      current_version: packageInfo.version,
    },
    codex_home: codexHome(),
    skill: installSkill({ force: true, quiet }),
    agents: installAgents({ quiet }),
    extensions: await extensionDiscoverySummary(),
    warnings: [],
  };

  report.package.previous_version = report.skill.previous_version;

  if (hasFlag("--json")) {
    printJson(report);
  } else {
    printInstallReport(report);
  }
}

function doctor() {
  const skillPath = join(installedSkillRoot(), "SKILL.md");
  const legacySkillPath = join(legacyInstalledSkillRoot(), "SKILL.md");
  const agentsPath = join(codexHome(), "agents");
  const installed = existsSync(skillPath);
  const legacyInstalled = existsSync(legacySkillPath);
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
    compatibility_skill_installed: legacyInstalled,
    compatibility_skill_path: legacySkillPath,
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

function checkUpdate() {
  const report = updateReport();

  if (hasFlag("--json")) {
    printJson(report);
    return;
  }

  if (report.check_status !== "ok") {
    console.log(`GoalBuddy update check unavailable: ${report.error}`);
  } else if (report.update_available) {
    console.log(`GoalBuddy ${report.latest_version} is available; installed version is ${report.current_version}.`);
    console.log(`Update with: ${report.update_command}`);
  } else {
    console.log(`GoalBuddy is up to date (${report.current_version}).`);
  }
}

function updateReport() {
  const report = {
    package: packageInfo.name,
    current_version: normalizeVersion(packageInfo.version),
    latest_version: null,
    update_available: false,
    check_status: "unknown",
    update_command: `npx ${canonicalCliName}`,
  };

  try {
    report.latest_version = latestPublishedVersion();
    report.update_available = compareVersions(report.current_version, report.latest_version) < 0;
    report.check_status = "ok";
  } catch (error) {
    report.check_status = "unavailable";
    report.error = error.message;
  }

  return report;
}

function plugin() {
  const subcommand = positional(1) || "";
  switch (subcommand) {
    case "install":
      installPlugin();
      break;
    case "help":
    case "--help":
    case "-h":
      pluginUsage();
      break;
    default:
      console.error(`Unknown plugin command: ${subcommand || "<missing>"}`);
      pluginUsage();
      process.exit(2);
  }
}

function pluginUsage() {
  console.log(`${canonicalProductName} Plugin

Usage:
  ${canonicalCliName} plugin install [--source <marketplace-source>] [--codex-home <path>] [--json]

Default source:
  tolibear/goalbuddy
`);
}

function installPlugin() {
  const source = optionValue("--source") || "tolibear/goalbuddy";
  const pluginSource = join(packageRoot, "plugins", pluginName);
  const pluginManifestPath = join(pluginSource, ".codex-plugin", "plugin.json");
  if (!existsSync(pluginManifestPath)) {
    throw new Error(`Plugin manifest not found: ${pluginManifestPath}`);
  }

  const pluginManifest = JSON.parse(readFileSync(pluginManifestPath, "utf8"));
  const pluginCachePath = pluginCacheRoot(pluginManifest.version);
  const marketplace = runCodex(["plugin", "marketplace", "add", source]);
  if (!marketplace.ok) {
    throw new Error(`Failed to add Codex plugin marketplace: ${firstLine(marketplace.stderr || marketplace.stdout)}`);
  }

  mkdirSync(dirname(pluginCachePath), { recursive: true });
  rmSync(pluginCachePath, { recursive: true, force: true });
  cpSync(pluginSource, pluginCachePath, { recursive: true });
  const configPath = enablePluginConfig();

  const report = {
    installed: true,
    plugin: `${pluginName}@${pluginName}`,
    version: pluginManifest.version,
    codex_home: codexHome(),
    marketplace_source: source,
    cache_path: pluginCachePath,
    config_path: configPath,
  };

  if (hasFlag("--json")) {
    printJson(report);
    return;
  }

  console.log(`Installed ${canonicalProductName} Codex plugin ${pluginManifest.version}`);
  console.log(`Marketplace: ${source}`);
  console.log(`Cache: ${pluginCachePath}`);
  console.log(`Config: ${configPath}`);
  console.log("");
  console.log("Restart Codex, then use:");
  console.log(`  $${canonicalSkillName}`);
  console.log("");
  console.log("Optional extensions:");
  console.log(`  npx ${canonicalCliName} extend`);
  console.log(`  npx ${canonicalCliName} extend install --all`);
}

function pluginCacheRoot(version) {
  return join(codexHome(), "plugins", "cache", pluginName, pluginName, version);
}

function enablePluginConfig() {
  const configPath = join(codexHome(), "config.toml");
  mkdirSync(dirname(configPath), { recursive: true });
  const header = `[plugins."${pluginName}@${pluginName}"]`;
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const updated = upsertTomlEnabled(existing, header);
  writeFileSync(configPath, updated);
  return configPath;
}

function upsertTomlEnabled(text, header) {
  const normalized = text.endsWith("\n") || text.length === 0 ? text : `${text}\n`;
  const lines = normalized.split("\n");
  const start = lines.findIndex((line) => line.trim() === header);
  if (start === -1) {
    const prefix = normalized.trim() ? `${normalized}\n` : "";
    return `${prefix}${header}\nenabled = true\n`;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*\[/.test(lines[index])) {
      end = index;
      break;
    }
  }

  let sawEnabled = false;
  for (let index = start + 1; index < end; index += 1) {
    if (/^\s*enabled\s*=/.test(lines[index])) {
      lines[index] = "enabled = true";
      sawEnabled = true;
      break;
    }
  }
  if (!sawEnabled) lines.splice(start + 1, 0, "enabled = true");

  return lines.join("\n").replace(/\n*$/, "\n");
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
  const env = { ...process.env, CODEX_HOME: codexHome() };
  const command = codexSpawnCommand(args, env);
  const result = spawnSync(command.file, command.args, {
    encoding: "utf8",
    env,
    shell: command.shell || false,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function codexSpawnCommand(args, env) {
  if (process.platform !== "win32") return { file: "codex", args };

  const command = resolveWindowsCommand("codex", env);
  if (!command) return { file: "codex", args };
  if (/\.(?:cmd|bat)$/i.test(command)) {
    const commandLine = [quoteWindowsCommandArg(command), ...args.map(quoteWindowsCommandArg)].join(" ");
    return {
      file: commandLine,
      args: [],
      shell: true,
    };
  }
  return { file: command, args };
}

function resolveWindowsCommand(name, env) {
  const systemWhere = env.SystemRoot ? join(env.SystemRoot, "System32", "where.exe") : "";
  const whereCommand = systemWhere && existsSync(systemWhere) ? systemWhere : "where.exe";
  const where = spawnSync(whereCommand, [name], { encoding: "utf8", env });
  if (where.status !== 0) return "";
  const candidates = where.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return candidates.find((candidate) => /\.(?:exe|cmd|bat)$/i.test(candidate))
    || candidates[0]
    || "";
}

function quoteWindowsCommandArg(value) {
  return `"${String(value).replace(/(["^&|<>()%])/g, "^$1")}"`;
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
  console.log(`${canonicalProductName} Extend

Usage:
  ${canonicalCliName} extend [--catalog-url <url-or-path>] [--kind <kind>] [--json]
  ${canonicalCliName} extend <id> [--catalog-url <url-or-path>] [--json]
  ${canonicalCliName} extend install <id> [--catalog-url <url-or-path>] [--dry-run] [--force] [--json]
  ${canonicalCliName} extend install --all [--catalog-url <url-or-path>] [--dry-run] [--force] [--json]
  ${canonicalCliName} extend doctor [<id>] [--codex-home <path>] [--json]

States:
  available   Listed in the catalog.
  installed   Copied into the local ${canonicalProductName} skill install.
  enabled     Allowed by a goal or task. Not implemented by this command yet.
  configured  Required local env/provider settings are present.

Catalog:
  Defaults to ${defaultCatalogUrl}
  Override with --catalog-url, GOALBUDDY_EXTEND_CATALOG_URL, or legacy GOAL_MAKER_EXTEND_CATALOG_URL.
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

  console.log("Available extensions");
  if (extensions.length === 0) {
    console.log("");
    console.log(kind ? `No ${kind} extensions found.` : "No extensions found.");
    return;
  }
  console.log("");
  for (const extension of extensions) {
    console.log(extension.name || extension.id);
    if (extension.summary) console.log(`  ${extension.summary}`);
    console.log(`  Details: npx ${canonicalCliName} extend ${extension.id}`);
    console.log("");
  }
  console.log("Install all:");
  console.log(`  npx ${canonicalCliName} extend install --all`);
}

async function extendDetails(id) {
  const catalog = await loadCatalog();
  const extension = catalog.extensions.find((candidate) => candidate.id === id);
  if (!extension) {
    printExtensionNotFound(id, catalog.extensions);
    process.exit(1);
  }
  validateCatalogExtension(extension);
  const detailed = extensionWithLocalState(extension);

  if (hasFlag("--json")) {
    printJson({ catalog_url: catalog.url, extension: detailed });
    return;
  }

  console.log(extension.name || extension.summary || "");
  console.log("");
  if (extension.summary && extension.summary !== extension.name) {
    console.log(extension.summary);
    console.log("");
  }
  console.log(`Status: ${detailed.state.installed ? "installed" : "available"}`);
  console.log(`Configured: ${detailed.state.configured ? "yes" : "no"}`);
  console.log(`ID: ${extension.id}`);
  console.log(`Kind: ${extension.kind}`);
  if (extension.version) console.log(`Version: ${extension.version}`);
  console.log(`Activation: ${extension.activation || "unspecified"}`);
  console.log(`Safe by default: ${extension.safe_by_default ? "yes" : "no"}`);
  console.log(`Requires approval: ${extension.requires_approval ? "yes" : "no"}`);
  if (!detailed.state.configured && detailed.state.missing_env.length) {
    console.log(`Missing env: ${detailed.state.missing_env.join(", ")}`);
  }
  printListSection("Use when", extension.use_when);
  printListSection("Outputs", extension.outputs);
  printListSection("Reads", extension.reads);
  printListSection("Writes", extension.writes);
  printListSection("Side effects", extension.side_effects);
  printListSection("Agent instructions", extension.agent_instructions);
  printListSection("Auth env", extension.auth?.env);
  printSupports(extension.supports);
  console.log("");
  console.log("Local use prompt:");
  console.log(`  ${extension.local_use_prompt || `Use the ${extension.name || extension.id} extension for docs/goals/<slug>/goal.md and write its ${firstValue(extension.outputs, "artifact")} as Markdown.`}`);
  console.log("");
  console.log("Install:");
  console.log(`  npx ${canonicalCliName} extend install ${extension.id}`);
  console.log("");
  console.log("Preview install:");
  console.log(`  npx ${canonicalCliName} extend install ${extension.id} --dry-run`);
}

function printListSection(title, values) {
  if (!Array.isArray(values) || values.length === 0) return;
  console.log("");
  console.log(`${title}:`);
  for (const value of values) console.log(`  - ${value}`);
}

function printSupports(supports) {
  if (!supports || typeof supports !== "object") return;
  const entries = Object.entries(supports);
  if (entries.length === 0) return;
  console.log("");
  console.log("Supports:");
  for (const [key, value] of entries) console.log(`  - ${key}: ${value}`);
}

function firstValue(values, fallback) {
  return Array.isArray(values) && values.length ? values[0] : fallback;
}

async function extendInstall() {
  const id = positional(2);
  const catalog = await loadCatalog();
  if (hasFlag("--all")) {
    await extendInstallAll(catalog);
    return;
  }

  if (!id) throw new Error(`Missing extension id. Usage: ${canonicalCliName} extend install <id>`);
  const extension = catalog.extensions.find((candidate) => candidate.id === id);
  if (!extension) {
    printExtensionNotFound(id, catalog.extensions);
    process.exit(1);
  }
  const result = await installCatalogExtension(catalog, extension);

  if (hasFlag("--dry-run")) {
    if (hasFlag("--json")) {
      printJson({ dry_run: true, extension: extensionWithLocalState(extension), target: result.target, files: result.plan });
    } else {
      console.log(`Would install ${extension.id} to ${result.target}`);
      for (const file of result.plan) console.log(`  ${file.path}`);
    }
    return;
  }

  if (hasFlag("--json")) {
    printJson({ installed: true, extension: extension.id, target: result.target });
  } else {
    console.log(`Installed ${extension.id} to ${result.target}`);
  }
}

async function extendInstallAll(catalog) {
  const results = [];
  for (const extension of catalog.extensions) {
    results.push(await installCatalogExtension(catalog, extension));
  }

  if (hasFlag("--dry-run")) {
    if (hasFlag("--json")) {
      printJson({
        dry_run: true,
        extensions: results.map(({ extension, target, plan }) => ({
          extension: extensionWithLocalState(extension),
          target,
          files: plan,
        })),
      });
    } else {
      console.log(`Would install ${results.length} extensions`);
      for (const { extension, target, plan } of results) {
        console.log(`${extension.id} -> ${target}`);
        for (const file of plan) console.log(`  ${file.path}`);
      }
    }
    return;
  }

  if (hasFlag("--json")) {
    printJson({
      installed: true,
      count: results.length,
      extensions: results.map(({ extension, target }) => ({ id: extension.id, target })),
    });
  } else {
    console.log(`Installed ${results.length} extensions`);
    for (const { extension, target } of results) console.log(`  ${extension.id} -> ${target}`);
  }
}

async function installCatalogExtension(catalog, extension) {
  validateCatalogExtension(extension);
  const target = extensionTarget(extension.id);
  const plan = installPlan(catalog, extension, target);

  if (hasFlag("--dry-run")) return { extension, target, plan };

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

  return { extension, target, plan };
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
  return join(codexHome(), "skills", canonicalSkillDirectory);
}

function installedPluginSkillRoot() {
  const root = join(codexHome(), "plugins", "cache", pluginName, pluginName);
  if (!existsSync(root)) return "";
  const versions = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareVersions)
    .reverse();
  for (const version of versions) {
    const skillPath = join(root, version, "skills", canonicalSkillDirectory);
    if (existsSync(join(skillPath, "SKILL.md"))) return skillPath;
  }
  return "";
}

function activeSkillRoot() {
  if (existsSync(join(installedSkillRoot(), "SKILL.md"))) return installedSkillRoot();
  const pluginSkillRoot = installedPluginSkillRoot();
  if (pluginSkillRoot) return pluginSkillRoot;
  return installedSkillRoot();
}

function legacyInstalledSkillRoot() {
  return join(codexHome(), "skills", legacySkillName);
}

function extendRoot() {
  return join(activeSkillRoot(), "extend");
}

function extensionTarget(id) {
  return join(extendRoot(), id);
}

function catalogUrl() {
  return optionValue("--catalog-url")
    || optionValue("--catalog")
    || process.env.GOALBUDDY_EXTEND_CATALOG_URL
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

function printExtensionNotFound(id, extensions) {
  console.error(`Extension not found: ${id}`);
  if (extensions.length) {
    console.error("");
    console.error("Available extensions:");
    for (const extension of extensions) {
      console.error(`  ${extension.id}`);
    }
  }
  console.error("");
  console.error("Try:");
  console.error(`  npx ${canonicalCliName} extend`);
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
    const response = await globalThis.fetch(location, {
      headers: {
        "accept-encoding": "identity",
      },
    });
    if (!response.ok) throw new Error(`Failed to fetch ${location}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  const path = location.startsWith("file://") ? fileURLToPath(location) : resolve(location);
  return readFileSync(path);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function directoryFingerprint(root, { exclude = new Set() } = {}) {
  if (!existsSync(root)) return "";
  const hash = createHash("sha256");
  for (const file of listFiles(root, { exclude })) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(join(root, file)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function listFiles(root, { exclude = new Set(), prefix = "" } = {}) {
  const entries = readdirSync(join(root, prefix), { withFileTypes: true })
    .filter((entry) => !exclude.has(prefix ? `${prefix}/${entry.name}` : entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFiles(root, { exclude, prefix: relative }));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files;
}

function preserveInstalledExtensions(targets) {
  const ids = [];
  const tempPath = join(codexHome(), `.goalbuddy-preserved-extend-${process.pid}-${Date.now()}`);
  let hasExtensions = false;
  for (const target of targets) {
    const source = join(target, "extend");
    if (!existsSync(source)) continue;
    mkdirSync(tempPath, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      const from = join(source, entry.name);
      const to = join(tempPath, entry.name);
      cpSync(from, to, { recursive: true, force: true });
      if (entry.isDirectory()) ids.push(entry.name);
      hasExtensions = true;
    }
    rmSync(source, { recursive: true, force: true });
  }
  return { tempPath: hasExtensions ? tempPath : "", ids: uniqueSorted(ids) };
}

function restoreInstalledExtensions(target, tempPath) {
  if (!tempPath) return;
  rmSync(join(target, "extend"), { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(tempPath, join(target, "extend"), { recursive: true });
}

function cleanupPreservedExtensions(paths) {
  for (const path of uniqueSorted(paths.filter(Boolean))) {
    rmSync(path, { recursive: true, force: true });
  }
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function installFingerprintExcludes() {
  return new Set(["extend", ".goalbuddy-install.json", ".goal-maker-install.json"]);
}

function installMetadataPath(target) {
  return join(target, ".goalbuddy-install.json");
}

function legacyInstallMetadataPath(target) {
  return join(target, ".goal-maker-install.json");
}

function readInstallMetadata(target) {
  for (const path of [installMetadataPath(target), legacyInstallMetadataPath(target)]) {
    if (!existsSync(path)) continue;
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

function writeInstallMetadata(target, previousMetadata) {
  writeFileSync(installMetadataPath(target), `${JSON.stringify({
    package_name: packageInfo.name,
    package_version: packageInfo.version,
    previous_package_version: previousMetadata?.package_version || "",
    installed_at: new Date().toISOString(),
  }, null, 2)}\n`);
}

async function extensionDiscoverySummary() {
  try {
    const catalog = await loadCatalog();
    const extensions = catalog.extensions.map(extensionWithLocalState);
    return {
      catalog_url: catalog.url,
      catalog_version: catalog.version || null,
      available_count: extensions.length,
      installed_count: extensions.filter((extension) => extension.state.installed).length,
      available: extensions.map((extension) => ({
        id: extension.id,
        name: extension.name,
        kind: extension.kind,
        version: extension.version,
        summary: extension.summary,
        activation: extension.activation,
        safe_by_default: extension.safe_by_default,
        installed: extension.state.installed,
        configured: extension.state.configured,
        use_when: extension.use_when,
        next_command: `${canonicalCliName} extend ${extension.id}`,
      })),
      recommended: extensions
        .filter((extension) => extension.safe_by_default && !extension.state.installed)
        .map((extension) => ({
          id: extension.id,
          name: extension.name,
          kind: extension.kind,
          activation: extension.activation,
          summary: extension.summary,
          use_when: extension.use_when.slice(0, 1),
          next_command: `${canonicalCliName} extend ${extension.id}`,
        })),
    };
  } catch (error) {
    return {
      catalog_url: catalogUrl(),
      catalog_version: null,
      available_count: 0,
      installed_count: 0,
      available: [],
      recommended: [],
      error: error.message,
    };
  }
}

function printInstallReport(report) {
  const verb = report.command === "update" ? "Updated" : "Installed";
  const previous = report.package.previous_version && report.package.previous_version !== report.package.current_version
    ? ` ${report.package.previous_version} -> ${report.package.current_version}`
    : ` ${report.package.current_version}`;
  console.log("");
  console.log(`${verb} ${canonicalProductName}${previous}`);
  console.log("");
  console.log(`Skill: ${report.skill.status} at ${report.skill.path}`);
  console.log(`Compatibility skill: ${report.skill.compatibility_path}`);
  const agentSummary = summarizeStatuses(report.agents);
  console.log(`Agents: ${agentSummary}`);
  if (report.skill.preserved_extensions.length) {
    console.log(`Preserved extensions: ${report.skill.preserved_extensions.join(", ")}`);
  }

  if (report.extensions.error) {
    console.log("");
    console.log(`Extensions: unavailable (${report.extensions.error})`);
  } else {
    console.log("");
    console.log(`Extensions: ${report.extensions.available_count} available from ${report.extensions.catalog_url}`);
    if (report.extensions.recommended.length) {
      console.log("");
      console.log("Recommended:");
      for (const extension of report.extensions.recommended.slice(0, 3)) {
        console.log(`  ${extension.name || extension.id}`);
        if (extension.summary) console.log(`    ${extension.summary}`);
        console.log(`    Details: npx ${extension.next_command}`);
      }
    }
  }

  console.log("");
  console.log("Next:");
  console.log(`  $${canonicalSkillName}`);
  console.log(`  ${canonicalCliName} extend`);
  console.log(`  ${legacyCliName} remains a temporary compatibility alias.`);
}

function summarizeStatuses(items) {
  const counts = items.reduce((memo, item) => {
    memo[item.status] = (memo[item.status] || 0) + 1;
    return memo;
  }, {});
  return Object.entries(counts)
    .map(([status, count]) => `${count} ${status}`)
    .join(", ");
}

function assertSkillInstalledForExtensionInstall() {
  if (!existsSync(join(activeSkillRoot(), "SKILL.md"))) {
    throw new Error(`${canonicalProductName} skill is not installed. Run: npx ${canonicalCliName}`);
  }
}

function latestPublishedVersion() {
  if (process.env.GOALBUDDY_TEST_NPM_LATEST_VERSION) {
    return normalizeVersion(process.env.GOALBUDDY_TEST_NPM_LATEST_VERSION);
  }

  const result = spawnSync("npm", ["view", packageInfo.name, "version"], {
    cwd: packageRoot,
    encoding: "utf8",
    timeout: 5000,
    env: {
      ...process.env,
      npm_config_update_notifier: "false",
    },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = `${result.stderr || ""}${result.stdout || ""}`.trim();
    throw new Error(output || `npm view exited with status ${result.status}`);
  }

  return normalizeVersion(result.stdout);
}

function normalizeVersion(value) {
  const match = String(value).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) throw new Error(`Unsupported version: ${value}`);
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`;
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersion(right).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff;
  }
  return left.localeCompare(right);
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
    local_use_prompt: extension.local_use_prompt || "",
    source: extension.source || "",
    docs: extension.docs || "",
    use_when: extension.use_when || [],
    activation: extension.activation || "",
    outputs: extension.outputs || [],
    requires_approval: extension.requires_approval || false,
    safe_by_default: extension.safe_by_default || false,
    applies_to: extension.applies_to || {},
    reads: extension.reads || [],
    writes: extension.writes || [],
    side_effects: extension.side_effects || [],
    agent_instructions: extension.agent_instructions || [],
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
