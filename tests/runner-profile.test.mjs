import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadRunnerProfile, validateRunnerProfile } from "../src/runner-profile.mjs";

const repoRoot = path.resolve(".");
const demoProfile = loadRunnerProfile("samples/demo-web-app/vericrate.runner-profile.json");

test("accepts the official demo RunnerProfile", () => {
  assert.deepEqual(validateRunnerProfile(demoProfile, { repoRoot }), { valid: true, errors: [] });
});

test("rejects workdir path traversal", () => {
  const profile = { ...demoProfile, workdir: ".." };
  const result = validateRunnerProfile(profile, { repoRoot });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /workdir/);
});

test("rejects missing pnpm lockfile", () => {
  const temp = makeTempProject();
  fs.writeFileSync(path.join(temp, "package.json"), JSON.stringify({ packageManager: "pnpm@11.7.0" }));
  const profile = { ...demoProfile, repo_path: path.relative(repoRoot, temp).replaceAll("\\", "/") };
  const result = validateRunnerProfile(profile, { repoRoot });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /pnpm-lock/);
});

test("rejects relaxed network policy", () => {
  const profile = { ...demoProfile, network_policy: { ...demoProfile.network_policy, default: "allow" } };
  const result = validateRunnerProfile(profile, { repoRoot });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /network_policy\.default/);
});

test("rejects Docker socket access", () => {
  const profile = { ...demoProfile, mount_policy: { ...demoProfile.mount_policy, docker_socket: "allowed" } };
  const result = validateRunnerProfile(profile, { repoRoot });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /docker_socket/);
});

test("rejects inline sensitive-looking environment values", () => {
  const profile = {
    ...demoProfile,
    env_allowlist: [...demoProfile.env_allowlist, { name: "API_TOKEN", source: "runner", value: "secret" }]
  };
  const result = validateRunnerProfile(profile, { repoRoot });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /API_TOKEN/);
});

function makeTempProject() {
  fs.mkdirSync(path.join(repoRoot, ".tmp"), { recursive: true });
  return fs.mkdtempSync(path.join(repoRoot, ".tmp", "vericrate-profile-test-"));
}
