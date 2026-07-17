import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { checkDocker } from "./docker-preflight.mjs";
import { DEFAULT_CONTAINER_POLICY, containerPolicyArgs, lifecycleSmokeScript, runnerCommand } from "./runner-policy.mjs";
import { loadRunnerProfile, validateRunnerProfile } from "./runner-profile.mjs";
import { createRunnerTempPaths } from "./runtime-paths.mjs";

export function runLifecycleSmoke(profilePath, options = {}) {
  return runWithWorkspace(profilePath, options, (context) => runLifecycleSmokeInWorkspace(context));
}

export function runProfileCommands(profilePath, options = {}) {
  return runWithWorkspace(profilePath, options, (context) => runProfileCommandsInWorkspace(context));
}

function runWithWorkspace(profilePath, options, callback) {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const profile = loadRunnerProfile(profilePath);
  const validation = validateRunnerProfile(profile, { repoRoot });
  if (!validation.valid) return { status: "insufficient_spec", errors: validation.errors };

  const docker = checkDocker({ run: options.run });
  if (docker.status !== "passed") return docker;

  const run = options.run ?? ((command, args) => runCommand(command, args, profile.resource_limits.command_timeout_ms));
  const runId = `m1-smoke-${Date.now().toString(36)}`;
  const paths = createRunnerTempPaths(runId, options);
  const tempRoot = paths.temp_root;
  const workspace = paths.workspace;
  const cacheDir = paths.cache_root;
  const source = path.resolve(repoRoot, profile.repo_path, profile.workdir);
  const commands = [];
  let finalResult;

  try {
    copyWorkspace(source, workspace);
    let runtimeImage = profile.image;
    commands.push(runDocker(run, docker.dockerCommand, ["image", "inspect", runtimeImage, "--format", "{{.Id}}"]));
    if (commands.at(-1).exitCode !== 0) {
      const localImage = findLocalImageId(run, docker.dockerCommand, profile.image, commands);
      if (localImage) {
        runtimeImage = localImage;
      } else {
        commands.push(runDocker(run, docker.dockerCommand, ["pull", profile.image]));
      }
      if (!localImage && commands.at(-1).exitCode !== 0) {
        finalResult = result("infrastructure_error", runId, docker, commands, tempRoot, ["docker image pull failed"]);
        return finalResult;
      }
    }
    const context = { profile, docker, run, runId, tempRoot, workspace, cacheDir, image: runtimeImage, commands };
    finalResult = callback(context);
    return finalResult;
  } finally {
    let cleanupError;
    try {
      const removeTempRoot = options.removeTempRoot ?? (target => fs.rmSync(target, { recursive: true, force: true }));
      removeTempRoot(tempRoot);
    } catch (error) {
      cleanupError = error.message;
    }
    if (finalResult) {
      finalResult.cleanup = fs.existsSync(tempRoot) ? "failed" : "removed";
      if (cleanupError) finalResult.cleanupError = cleanupError;
    }
  }
}

function runLifecycleSmokeInWorkspace(context) {
  const { docker, run, runId, tempRoot, workspace, image, commands } = context;
  commands.push(runContainer(run, docker.dockerCommand, runId, workspace, image, lifecycleSmokeScript(), { workspaceMode: "ro" }));
  const outcome = failedOutcome(commands.at(-1), "lifecycle smoke");
  if (outcome) return result(outcome.status, runId, docker, commands, tempRoot, [outcome.error]);
  return result("passed", runId, docker, commands, tempRoot, []);
}

function runProfileCommandsInWorkspace(context) {
  const { profile, docker, run, runId, tempRoot, workspace, cacheDir, image, commands } = context;
  const policy = commandPolicy(profile);
  const phases = [
    ["install", profile.commands.install, "bridge"],
    ["build", profile.commands.build, "none"],
    ["test", profile.commands.test, "none"]
  ];
  for (const [phase, command, network] of phases) {
    if (Array.isArray(command)) continue;
    commands.push(runContainer(run, docker.dockerCommand, `${runId}-${phase}`, workspace, image, runnerCommand(command, profile.package_manager), { phase, network, workspaceMode: "rw", policy, cacheDir }));
    const outcome = failedOutcome(commands.at(-1), phase);
    if (outcome) return result(outcome.status, runId, docker, commands, tempRoot, [outcome.error]);
    const resourceOutcome = resourceLimitOutcome(commands.at(-1), workspace, profile.resource_limits, phase);
    if (resourceOutcome) return result(resourceOutcome.status, runId, docker, commands, tempRoot, [resourceOutcome.error]);
  }
  return result("passed", runId, docker, commands, tempRoot, []);
}

function runContainer(run, dockerCommand, runId, workspace, image, command, options = {}) {
  const containerName = `vericrate-${runId}`;
  const record = runDocker(run, dockerCommand, [
    "run",
    "--rm",
    "--name", containerName,
    ...containerPolicyArgs(workspace, options.policy, options),
    image,
    "sh",
    "-lc",
    command
  ], options.phase);
  if (record.timedOut || record.cancelled) {
    record.containerCleanup = runDocker(run, dockerCommand, ["rm", "-f", containerName], `${options.phase ?? "container"}:cleanup`);
  }
  return record;
}

function findLocalImageId(run, dockerCommand, image, commands) {
  const record = runDocker(run, dockerCommand, ["image", "ls", "--format", "{{.Repository}}:{{.Tag}} {{.ID}}"]);
  commands.push(record);
  if (record.exitCode !== 0) return null;
  for (const line of record.stdout.split(/\r?\n/)) {
    const [tag, id] = line.trim().split(/\s+/, 2);
    if (tag === image && id) return id;
  }
  return null;
}

function failedOutcome(record, phase) {
  if (record.timedOut) return { status: "timeout", error: `${phase} command timed out` };
  if (record.cancelled) return { status: "cancelled", error: `${phase} command cancelled` };
  if (record.exitCode !== 0) return { status: "failed", error: `${phase} command failed` };
  return null;
}

function resourceLimitOutcome(record, workspace, limits, phase) {
  const outputBytes = Buffer.byteLength(record.stdout ?? "") + Buffer.byteLength(record.stderr ?? "");
  const outputLimitBytes = limits.stdout_stderr_mb * 1024 * 1024;
  if (outputBytes > outputLimitBytes) {
    record.resourceLimitExceeded = { type: "stdout_stderr", outputBytes, limitBytes: outputLimitBytes };
    return { status: "failed", error: `${phase} output exceeded stdout/stderr limit` };
  }
  const usage = workspaceUsage(workspace);
  const diskLimitBytes = limits.disk_mb * 1024 * 1024;
  if (usage.files > limits.file_count) {
    record.resourceLimitExceeded = { type: "file_count", ...usage, limitFiles: limits.file_count };
    return { status: "failed", error: `${phase} workspace file count exceeded limit` };
  }
  if (usage.bytes > diskLimitBytes) {
    record.resourceLimitExceeded = { type: "disk", ...usage, limitBytes: diskLimitBytes };
    return { status: "failed", error: `${phase} workspace disk usage exceeded limit` };
  }
  return null;
}

function workspaceUsage(root) {
  let files = 0;
  let bytes = 0;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files += 1;
        bytes += fs.statSync(fullPath).size;
      }
    }
  }
  return { files, bytes };
}

function commandPolicy(profile) {
  return {
    ...DEFAULT_CONTAINER_POLICY,
    cpus: String(profile.resource_limits.cpu),
    memory: `${profile.resource_limits.memory_mb}m`,
    pidsLimit: String(profile.resource_limits.pids)
  };
}

function runDocker(run, dockerCommand, args, phase) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const output = run(dockerCommand, args);
  const timedOut = output.timedOut === true || output.errorCode === "ETIMEDOUT";
  return {
    phase,
    command: [dockerCommand, ...args],
    exitCode: output.exitCode,
    stdout: output.stdout,
    stderr: output.stderr,
    errorCode: output.errorCode,
    signal: output.signal,
    timedOut,
    cancelled: !timedOut && (output.cancelled === true || output.errorCode === "ABORT_ERR" || output.signal === "SIGINT"),
    startedAt,
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - started
  };
}

function result(status, runId, docker, commands, tempRoot, errors) {
  return {
    status,
    runId,
    dockerCommand: docker.dockerCommand,
    dockerVersion: docker.version,
    dockerServerVersion: docker.serverVersion,
    policy: DEFAULT_CONTAINER_POLICY,
    tempRoot,
    cleanup: "pending",
    commands,
    errors
  };
}

function copyWorkspace(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, {
    recursive: true,
    filter: sourcePath => {
      const name = path.basename(sourcePath);
      if (["node_modules", "dist", "coverage", ".git", ".next", ".ssh", "secrets", "credentials"].includes(name)) return false;
      if ([".gitconfig", ".git-credentials"].includes(name)) return false;
      if (name === ".env" || (name.startsWith(".env.") && name !== ".env.example")) return false;
      if (name === ".npmrc") return false;
      if (/\.(db|sqlite|sqlite3)$/i.test(name)) return false;
      return true;
    }
  });
}

function runCommand(command, args, timeoutMs = 300000) {
  const env = { ...process.env };
  if (path.isAbsolute(command)) env.PATH = `${path.dirname(command)}${path.delimiter}${env.PATH ?? ""}`;
  const result = spawnSync(command, args, { encoding: "utf8", timeout: timeoutMs, env });
  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    errorCode: result.error?.code,
    signal: result.signal
  };
}
