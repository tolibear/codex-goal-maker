import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const script = "internal/cli/check-publish-version.mjs";
const currentVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const previousVersion = offsetPatchVersion(currentVersion, -1);
const olderVersion = offsetPatchVersion(currentVersion, -2);
const nextVersion = offsetPatchVersion(currentVersion, 1);

function runCheck(publishedVersions) {
  return spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      GOALBUDDY_PUBLISHED_VERSIONS: publishedVersions,
      GOAL_MAKER_PUBLISHED_VERSIONS: "",
    },
  });
}

test("publish version check passes when package version is newer than npm", () => {
  const result = runCheck(JSON.stringify([olderVersion, previousVersion]));

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, new RegExp(`goalbuddy@${escapeRegex(currentVersion)} > published ${escapeRegex(previousVersion)}`));
});

test("publish version check rejects already-published package version", () => {
  const result = runCheck(JSON.stringify([previousVersion, currentVersion]));

  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`goalbuddy@${escapeRegex(currentVersion)} has already been published`));
});

test("publish version check rejects package versions behind the registry", () => {
  const result = runCheck(JSON.stringify([previousVersion, nextVersion]));

  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`must be greater than the latest published version ${escapeRegex(nextVersion)}`));
});

function offsetPatchVersion(version, offset) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  assert.ok(match, `expected plain semver version, got ${version}`);
  const patch = Number(match[3]) + offset;
  assert.ok(patch >= 0, `patch offset produced negative version for ${version}`);
  return `${match[1]}.${match[2]}.${patch}`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
