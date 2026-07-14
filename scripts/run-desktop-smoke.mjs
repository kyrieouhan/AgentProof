#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exe = argValue("--exe") ? path.resolve(argValue("--exe")) : electronExecutable();
const timeoutMs = Number(argValue("--timeout-ms") ?? 120000);
const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agentproof-desktop-smoke data "));
const args = argValue("--exe") ? ["--smoke"] : [repoRoot, "--smoke"];

const result = await run(exe, args, {
  env: { ...process.env, AGENTPROOF_DATA_DIR: dataRoot },
  timeoutMs
});

if (result.exitCode !== 0) {
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  throw new Error(`Desktop smoke exited with code ${result.exitCode}.`);
}

const summary = parseJsonOutput(result.stdout);
assert(summary.status === "passed", "desktop smoke status should pass");
assert(summary.checks.find(([name]) => name === "api_without_token")?.[1]?.status === 401, "desktop API should reject missing token");
assert(summary.checks.find(([name]) => name === "api_with_token")?.[1]?.status === 200, "desktop API should accept the session token");
assert(summary.window_options.nodeIntegration === false, "nodeIntegration must be disabled");
assert(summary.window_options.contextIsolation === true, "contextIsolation must be enabled");
assert(summary.window_options.sandbox === true, "sandbox must be enabled");
assert(summary.window_options.webSecurity === true, "webSecurity must be enabled");
assert(summary.data_root === dataRoot, "AGENTPROOF_DATA_DIR override should be honored");
assert(fs.existsSync(summary.official_demo_root), "official demo copy should exist");
assert(!result.stdout.includes("x-agentproof-session"), "session token header name should not be printed");

console.log(JSON.stringify({
  status: "passed",
  executable: exe,
  data_root: dataRoot,
  official_demo_root: summary.official_demo_root,
  checks: summary.checks.map(([name, value]) => ({ name, status: value.status ?? (value.ok ? 200 : 500) }))
}, null, 2));

function electronExecutable() {
  if (process.platform === "win32") return path.join(repoRoot, "node_modules", "electron", "dist", "electron.exe");
  if (process.platform === "darwin") return path.join(repoRoot, "node_modules", "electron", "dist", "Electron.app", "Contents", "MacOS", "Electron");
  return path.join(repoRoot, "node_modules", "electron", "dist", "electron");
}

function run(command, args, { env, timeoutMs: timeout }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, env, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Desktop smoke timed out after ${timeout} ms.`));
    }, timeout);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      clearTimeout(timer);
      resolve({ exitCode: typeof code === "number" ? code : 1, stdout, stderr });
    });
  });
}

function parseJsonOutput(stdout) {
  for (let index = 0; index < stdout.length; index += 1) {
    const candidate = stdout.slice(index).trim();
    if (!candidate.startsWith("{")) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // keep scanning; Electron may print diagnostics before JSON
    }
  }
  throw new Error("Desktop smoke did not print a JSON summary.");
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
