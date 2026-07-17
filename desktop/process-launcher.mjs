import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function createProcessLauncher({ execPath = process.execPath, baseEnv = process.env, logger } = {}) {
  const children = new Set();
  const electronRunAsNode = isElectronRuntime(execPath);
  return {
    runNode(cwd, args, extraEnv = {}) {
      return runNodeProcess({ execPath, cwd, args, env: nodeEnv(baseEnv, extraEnv, { electronRunAsNode }), children, logger });
    },
    killAll() {
      for (const child of [...children]) {
        if (child.exitCode === null) child.kill("SIGTERM");
      }
    },
    childCount() {
      return children.size;
    }
  };
}

export function resolveBundledNode(appRoot, fallback = process.execPath) {
  const executable = process.platform === "win32" ? "node.exe" : "node";
  const candidates = [
    path.join(appRoot, "node_modules", "node", "bin", executable),
    path.join(appRoot, "node_modules", "node", "bin", "node.exe")
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) ?? fallback;
}

export function nodeEnv(baseEnv = process.env, extraEnv = {}, { electronRunAsNode = true } = {}) {
  const env = {
    ...baseEnv,
    ...extraEnv
  };
  if (electronRunAsNode) env.ELECTRON_RUN_AS_NODE = "1";
  else delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function isElectronRuntime(execPath) {
  return /(?:electron|vericrate)\.exe$/i.test(execPath) || path.basename(execPath).toLowerCase() === "electron";
}

function runNodeProcess({ execPath, cwd, args, env, children, logger }) {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(execPath, args, {
      cwd,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    children.add(child);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      logger?.error("Child process failed to start.", { error: error.message, args });
    });
    child.on("close", (code, signal) => {
      children.delete(child);
      resolve({
        exitCode: typeof code === "number" ? code : 1,
        signal,
        durationMs: Date.now() - started,
        stdout,
        stderr
      });
    });
  });
}
