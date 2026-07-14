import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRunPaths, createRunnerTempPaths, defaultDataRoot, isInside, validateDataRoot } from "../src/runtime-paths.mjs";

test("default data root belongs to AgentProof, not the target project", () => {
  const projectRoot = path.join(os.tmpdir(), "agentproof-target-project");
  const localAppData = path.join(os.tmpdir(), "agentproof-local-appdata");
  const root = defaultDataRoot({ LOCALAPPDATA: localAppData }, "win32");
  assert.equal(root, path.join(localAppData, "AgentProof"));
  assert.equal(isInside(projectRoot, root), false);
});

test("AGENTPROOF_DATA_DIR overrides the default data root", () => {
  const override = path.join(os.tmpdir(), "agentproof-data-override");
  assert.equal(defaultDataRoot({ AGENTPROOF_DATA_DIR: override, LOCALAPPDATA: path.join(os.tmpdir(), "ignored") }, "win32"), path.resolve(override));
});

test("data root rejects relative, traversal, and null-byte paths", () => {
  assert.throws(() => validateDataRoot("relative-agentproof-data"), /absolute/);
  assert.throws(() => validateDataRoot(`${path.resolve(os.tmpdir())}${path.sep}..${path.sep}elsewhere`), /must not contain/);
  assert.throws(() => validateDataRoot(`${path.resolve(os.tmpdir())}\0bad`), /null byte/);
});

test("run paths are created under the data root", () => {
  const dataDir = path.join(os.tmpdir(), `agentproof-test-data-${Date.now()}`);
  const paths = createRunPaths("web-test-001", { dataDir });
  assert.equal(paths.data_root, path.resolve(dataDir));
  assert.equal(isInside(paths.data_root, paths.run_dir), true);
  assert.equal(isInside(paths.run_dir, paths.evidence_dir), true);
});

test("runner temp and cache paths are created under the data root", () => {
  const dataDir = path.join(os.tmpdir(), `agentproof-runner-data-${Date.now()}`);
  const paths = createRunnerTempPaths("runner-test-001", { dataDir });
  assert.equal(isInside(paths.data_root, paths.temp_root), true);
  assert.equal(isInside(paths.data_root, paths.workspace), true);
  assert.equal(isInside(paths.data_root, paths.cache_root), true);
  assert.equal(fs.existsSync(path.join(paths.cache_root, "corepack")), true);
  assert.equal(fs.existsSync(path.join(paths.cache_root, "pnpm-store")), true);
});
