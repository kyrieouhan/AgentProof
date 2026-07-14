import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function checkDocker(options = {}) {
  const run = options.run ?? runCommand;
  const candidates = options.docker ? [options.docker] : dockerCandidates();
  let version;
  let docker;

  for (const candidate of candidates) {
    const result = run(candidate, ["--version"]);
    if (result.exitCode === 0) {
      version = result;
      docker = candidate;
      break;
    }
    if (result.errorCode !== "ENOENT") {
      return {
        status: "infrastructure_error",
        dockerAvailable: false,
        engineAvailable: false,
        errors: [`docker --version failed with exit code ${result.exitCode}`],
        stderr: result.stderr
      };
    }
  }

  if (!version) {
    return {
      status: "infrastructure_error",
      dockerAvailable: false,
      engineAvailable: false,
      errors: ["docker CLI not found"]
    };
  }

  const info = run(docker, ["info", "--format", "{{json .ServerVersion}}"]);
  if (info.exitCode !== 0) {
    return {
      status: "infrastructure_error",
      dockerAvailable: true,
      engineAvailable: false,
      dockerCommand: docker,
      version: version.stdout.trim(),
      errors: [`docker engine unavailable; docker info exited ${info.exitCode}`],
      stderr: info.stderr
    };
  }

  return {
    status: "passed",
    dockerAvailable: true,
    engineAvailable: true,
    dockerCommand: docker,
    version: version.stdout.trim(),
    serverVersion: safeParseJson(info.stdout.trim()) ?? info.stdout.trim()
  };
}

export function dockerCandidates(env = process.env) {
  const candidates = [env.AGENTPROOF_DOCKER, "docker"];
  for (const base of [env.LOCALAPPDATA, env.ProgramFiles, env["ProgramFiles(x86)"]]) {
    if (!base) continue;
    candidates.push(path.join(base, "Programs", "DockerDesktop", "resources", "bin", "docker.exe"));
    candidates.push(path.join(base, "Docker", "Docker", "resources", "bin", "docker.exe"));
  }
  return [...new Set(candidates.filter(Boolean))].filter(candidate => candidate === "docker" || fs.existsSync(candidate));
}

function runCommand(command, args) {
  const env = { ...process.env };
  if (path.isAbsolute(command)) env.PATH = `${path.dirname(command)}${path.delimiter}${env.PATH ?? ""}`;
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 10000, env });
  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    errorCode: result.error?.code
  };
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
