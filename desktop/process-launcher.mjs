import { spawn } from "node:child_process";

export function createProcessLauncher({ execPath = process.execPath, baseEnv = process.env, logger } = {}) {
  const children = new Set();
  return {
    runNode(cwd, args, extraEnv = {}) {
      return runNodeProcess({ execPath, cwd, args, env: nodeEnv(baseEnv, extraEnv), children, logger });
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

export function nodeEnv(baseEnv = process.env, extraEnv = {}) {
  return {
    ...baseEnv,
    ...extraEnv,
    ELECTRON_RUN_AS_NODE: "1"
  };
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
