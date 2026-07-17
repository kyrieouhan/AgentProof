import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SAFE_ID = /^[A-Za-z0-9_.-]+$/;
const LEGACY_WINDOWS_DATA_DIR = "AgentProof";
const LEGACY_POSIX_DATA_DIR = ".agentproof";

export function defaultDataRoot(env = process.env, platform = process.platform) {
  if (env.VERICRATE_DATA_DIR) return validateDataRoot(env.VERICRATE_DATA_DIR);
  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA;
    if (!localAppData) throw new Error("LOCALAPPDATA is required to choose the default VeriCrate data directory on Windows.");
    const root = path.resolve(localAppData, "VeriCrate");
    migrateLegacyDataRoot(path.resolve(localAppData, LEGACY_WINDOWS_DATA_DIR), root, env);
    return root;
  }
  const root = path.resolve(os.homedir(), ".vericrate");
  migrateLegacyDataRoot(path.resolve(os.homedir(), LEGACY_POSIX_DATA_DIR), root, env);
  return root;
}

export function validateDataRoot(value) {
  const root = String(value ?? "").trim();
  if (!root) throw new Error("VERICRATE_DATA_DIR must not be empty.");
  if (root.includes("\0")) throw new Error("VERICRATE_DATA_DIR contains an invalid null byte.");
  if (!path.isAbsolute(root)) throw new Error("VERICRATE_DATA_DIR must be an absolute path.");
  if (root.split(/[\\/]+/).includes("..")) throw new Error("VERICRATE_DATA_DIR must not contain '..' path segments.");
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
  if (!SAFE_ID.test(id)) throw new Error(`Unsafe VeriCrate path id: ${id || "(empty)"}`);
  return id;
}

function migrateLegacyDataRoot(legacyRoot, targetRoot, env) {
  if (env.VERICRATE_SKIP_LEGACY_DATA_MIGRATION === "1") return;
  try {
    if (fs.existsSync(targetRoot) || !fs.existsSync(legacyRoot)) return;
    fs.cpSync(legacyRoot, targetRoot, { recursive: true, force: false, errorOnExist: false });
  } catch {
    // Best-effort migration only: a copy failure must not block creating a fresh VeriCrate data root.
  }
}
