import assert from "node:assert/strict";
import test from "node:test";
import { containerPolicyArgs, lifecycleSmokeScript, runnerCommand } from "../src/runner-policy.mjs";

test("container policy denies network and drops privileges", () => {
  const args = containerPolicyArgs("<PROJECT_PATH>");
  assert.deepEqual(args.slice(0, 2), ["--network", "none"]);
  assert.equal(args.includes("--cap-drop"), true);
  assert.equal(args.includes("ALL"), true);
  assert.equal(args.includes("--security-opt"), true);
  assert.equal(args.includes("no-new-privileges"), true);
  assert.equal(args.includes("--read-only"), true);
  assert.equal(args.includes("<PROJECT_PATH>:/workspace:ro"), true);
});

test("lifecycle smoke script checks non-root, read-only mounts and denied network", () => {
  const script = lifecycleSmokeScript();
  assert.match(script, /id -u/);
  assert.match(script, /agentproof-write-test/);
  assert.match(script, /1\.1\.1\.1/);
});

test("runner command uses corepack for pnpm without enabling global shims", () => {
  assert.match(runnerCommand("pnpm install --frozen-lockfile", "pnpm"), /COREPACK_HOME=\/workspace\/\.agentproof-corepack/);
  assert.match(runnerCommand("pnpm install --frozen-lockfile", "pnpm"), /corepack pnpm install --frozen-lockfile/);
});
