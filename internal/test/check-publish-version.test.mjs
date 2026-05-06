import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const script = "internal/cli/check-publish-version.mjs";

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
  const result = runCheck(JSON.stringify(["0.2.8", "0.2.9"]));

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /goalbuddy@0\.2\.10 > published 0\.2\.9/);
});

test("publish version check rejects already-published package version", () => {
  const result = runCheck(JSON.stringify(["0.2.9", "0.2.10"]));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /goalbuddy@0\.2\.10 has already been published/);
});

test("publish version check rejects package versions behind the registry", () => {
  const result = runCheck(JSON.stringify(["0.2.9", "0.2.11"]));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be greater than the latest published version 0\.2\.11/);
});
