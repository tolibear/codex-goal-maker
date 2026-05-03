#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const skillSource = join(packageRoot, "goal-maker");
const defaultCodexHome = process.env.CODEX_HOME || join(homedir(), ".codex");

const args = process.argv.slice(2);
const command = args.includes("--help") || args.includes("-h")
  ? "help"
  : args[0] && !args[0].startsWith("-")
    ? args[0]
    : "install";

function optionValue(name) {
  const exact = args.indexOf(name);
  if (exact !== -1) return args[exact + 1];
  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : null;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.log(`Codex Goal Maker

Usage:
  goal-maker install [--codex-home <path>] [--force]
  goal-maker update [--codex-home <path>]
  goal-maker agents [--codex-home <path>] [--force]
  goal-maker doctor [--codex-home <path>]

Default:
  goal-maker  Installs the skill and bundled agent definitions.

Environment:
  CODEX_HOME  Overrides the default ~/.codex target.
`);
}

function codexHome() {
  return resolve(optionValue("--codex-home") || defaultCodexHome);
}

function installSkill({ force = true } = {}) {
  const target = join(codexHome(), "skills", "goal-maker");
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

  cpSync(skillSource, target, { recursive: true });
  console.log(`Installed Codex Goal Maker skill to ${target}`);
}

function installAgents() {
  const source = join(skillSource, "agents");
  const target = join(codexHome(), "agents");
  const force = hasFlag("--force");
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
  const skillPath = join(codexHome(), "skills", "goal-maker", "SKILL.md");
  const agentsPath = join(codexHome(), "agents");
  const installed = existsSync(skillPath);
  const agents = existsSync(agentsPath)
    ? readdirSync(agentsPath).filter((file) => file.startsWith("goal_") && file.endsWith(".toml"))
    : [];

  console.log(JSON.stringify({
    codex_home: codexHome(),
    skill_installed: installed,
    skill_path: skillPath,
    installed_agents: agents,
  }, null, 2));

  process.exit(installed ? 0 : 1);
}

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
