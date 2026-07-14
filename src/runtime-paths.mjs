import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SAFE_ID = /^[A-Za-z0-9_.-]+$/;

export function defaultDataRoot(env = process.env, platform = process.platform) {
  if (env.AGENTPROOF_DATA_DIR) return validateDataRoot(env.AGENTPROOF_DATA_DIR);
  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA;
    if (!localAppData) throw new Error("LOCALAPPDATA is required to choose the default AgentProof data directory on Windows.");
    return path.resolve(localAppData, "AgentProof");
  }
  return path.resolve(os.homedir(), ".agentproof");
}

export function validateDataRoot(value) {
  const root = String(value ?? "").trim();
  if (!root) throw new Error("AGENTPROOF_DATA_DIR must not be empty.");
  if (root.includes("\0")) throw new Error("AGENTPROOF_DATA_DIR contains an invalid null byte.");
  if (!path.isAbsolute(root)) throw new Error("AGENTPROOF_DATA_DIR must be an absolute path.");
  if (root.split(/[\\/]+/).includes("..")) throw new Error("AGENTPROOF_DATA_DIR must not contain '..' path segments.");
  return path.resolve(root);
}

export function createRunPaths(runId, options = {}) {
  const root = dataRoot(options);
  const runDir = path.join(root, "runs", safePathId(runId));
  const evidenceDir = path.join(runDir, "evidence");
  const tempDir = path.join(runDir, "tmp");
  for (const dir of [runDir, evidenceDir, tempDir]) fs.mkdirSync(dir, { recursive: true });
  return { data_root: root, run_dir: runDir, report_dir: runDir, evidence_dir: evidenceDir, temp_dir: tempDir };
}

export function createSmokeRunPaths(smokeName, runId, options = {}) {
  const root = dataRoot(options);
  const runDir = path.join(root, "smoke", safePathId(smokeName), safePathId(runId));
  const evidenceDir = path.join(runDir, "evidence");
  const tempDir = path.join(runDir, "tmp");
  for (const dir of [runDir, evidenceDir, tempDir]) fs.mkdirSync(dir, { recursive: true });
  return { data_root: root, run_dir: runDir, report_dir: runDir, evidence_dir: evidenceDir, temp_dir: tempDir };
}

export function createRunnerTempPaths(runId, options = {}) {
  const root = dataRoot(options);
  const temp_root = path.join(root, "tmp", "runner", safePathId(runId));
  const workspace = path.join(temp_root, "workspace");
  const cache_root = path.join(root, "cache", "runner");
  for (const dir of [workspace, path.join(cache_root, "corepack"), path.join(cache_root, "pnpm-home"), path.join(cache_root, "pnpm-store")]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return { data_root: root, temp_root, workspace, cache_root };
}

export function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function dataRoot(options) {
  return options.dataDir ? validateDataRoot(options.dataDir) : defaultDataRoot(options.env ?? process.env, options.platform ?? process.platform);
}

function safePathId(value) {
  const id = String(value ?? "").trim();
  if (!SAFE_ID.test(id)) throw new Error(`Unsafe AgentProof path id: ${id || "(empty)"}`);
  return id;
}
