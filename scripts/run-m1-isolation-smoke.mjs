#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { checkDocker } from "../src/docker-preflight.mjs";
import { runLifecycleSmoke, runProfileCommands } from "../src/docker-runner.mjs";
import { DEFAULT_CONTAINER_POLICY, containerPolicyArgs } from "../src/runner-policy.mjs";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : ".");
const outputDir = path.join(repoRoot, "artifacts", "m1-isolation-smoke");
const tempRoot = path.join(repoRoot, ".tmp", `m1-isolation-smoke-${Date.now().toString(36)}`);
const source = path.join(tempRoot, "source");
const workspace = path.join(tempRoot, "workspace");
const image = "node:20-bookworm";
const records = [];

fs.rmSync(tempRoot, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
prepareWorkspace();

const docker = checkDocker();
if (docker.status !== "passed") {
  throw new Error(`Docker unavailable: ${(docker.errors ?? []).join("; ")}`);
}
ensureImage(docker.dockerCommand);

records.push(runIso("ISO-01", "host user paths are not mounted", "test ! -e /mnt/c/Users && test ! -e /host && test ! -e /Users/vericrate-user"));
records.push(runIso("ISO-02", "ssh/git/npm/env credentials are absent", "test ! -e /workspace/.env && test ! -e /workspace/.npmrc && test ! -e /workspace/.ssh/id_rsa && test ! -e /workspace/.gitconfig && test ! -e /workspace/.git-credentials && test ! -e /root/.ssh && ! env | grep -Ei 'TOKEN|COOKIE|SECRET|PASSWORD'"));
records.push(runIso("ISO-03", "docker socket and docker cli are absent", "test ! -S /var/run/docker.sock && test ! -e /var/run/docker.sock && ! command -v docker"));
records.push(runIso("ISO-04", "only tmpfs is writable in read-only mode", "touch /tmp/iso04-ok && ! touch /workspace/iso04-forbidden && ! touch /vericrate-root-write-test"));
records.push(runIso("ISO-05", "default network cannot reach public, localhost, or metadata targets", networkProbeScript()));
records.push(runIso("ISO-06", "memory and pid cgroup limits are visible", "test \"$(id -u)\" = \"1000\" && test \"$(cat /sys/fs/cgroup/pids.max)\" = \"64\" && node -e \"const fs=require('fs');const mem=fs.readFileSync('/sys/fs/cgroup/memory.max','utf8').trim();const cpu=fs.readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim();if(mem==='max'||Number(mem)>300000000||cpu.startsWith('max')) process.exit(1);\""));
records.push(runResourceLimitProbe());
records.push(runTimeoutProbe());
records.push(runIso("ISO-09", "non-root, no-new-privileges, and dropped capabilities are active", "test \"$(id -u)\" = \"1000\" && grep -Eq 'NoNewPrivs:[[:space:]]+1' /proc/self/status && grep -Eq 'CapEff:[[:space:]]+0000000000000000' /proc/self/status && test ! -e /dev/kvm"));
records.push(runIso("ISO-10", "workspace path traversal does not expose host paths", "test ! -e /workspace/../.gitconfig && test ! -e /workspace/../../Users && test ! -e /workspace/../../host_mnt"));
records.push(runIso("ISO-11", "target cannot write trusted manifest location", "mkdir -p /tmp/fake-artifacts && touch /tmp/fake-artifacts/manifest.json && ! touch /workspace/vericrate-manifest.json"));
records.push(runIso("ISO-12", "canary sensitive values are not injected into container env", "! env | grep VERICRATE_ISO_CANARY"));
records.push(runReplayProbe());
records.push(runCleanupFailureProbe());

const status = records.every(record => record.status === "passed") ? "passed" : "failed";
const summary = {
  status,
  run_id: path.basename(tempRoot),
  docker_command: docker.dockerCommand,
  docker_version: docker.version,
  docker_server_version: docker.serverVersion,
  image_digest: imageDigest(docker.dockerCommand),
  records
};

fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "report.md"), renderReport(summary));
fs.rmSync(tempRoot, { recursive: true, force: true });

console.log(JSON.stringify({ status, passed: records.filter(r => r.status === "passed").length, total: records.length, report: path.relative(repoRoot, path.join(outputDir, "report.md")) }, null, 2));
if (status !== "passed") process.exit(1);

function prepareWorkspace() {
  fs.cpSync(path.join(repoRoot, "samples", "minimal-npm-api"), source, { recursive: true });
  fs.writeFileSync(path.join(source, ".env"), "VERICRATE_ISO_CANARY=secret\n");
  fs.writeFileSync(path.join(source, ".npmrc"), "//registry.example.invalid/:_authToken=secret\n");
  fs.mkdirSync(path.join(source, ".ssh"), { recursive: true });
  fs.writeFileSync(path.join(source, ".ssh", "id_rsa"), "secret\n");
  fs.writeFileSync(path.join(source, ".gitconfig"), "[credential]\nhelper = store\n");
  fs.writeFileSync(path.join(source, ".git-credentials"), "https://secret@example.invalid\n");
  copyWorkspaceLikeRunner(source, workspace);
}

function copyWorkspaceLikeRunner(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, {
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

function ensureImage(dockerCommand) {
  let result = run(dockerCommand, ["image", "inspect", image, "--format", "{{.Id}}"], 30000);
  if (result.exitCode === 0) return;
  result = run(dockerCommand, ["pull", image], 120000);
  if (result.exitCode !== 0) throw new Error(`Unable to inspect or pull ${image}: ${result.stderr || result.stdout}`);
}

function runIso(id, title, script, options = {}) {
  const name = `vericrate-${id.toLowerCase()}-${Date.now().toString(36)}`;
  const args = [
    "run",
    "--rm",
    "--name", name,
    ...containerPolicyArgs(workspace, options.policy ?? DEFAULT_CONTAINER_POLICY, { workspaceMode: options.workspaceMode ?? "ro", network: options.network ?? "none" }),
    image,
    "sh",
    "-lc",
    script
  ];
  const result = run(docker.dockerCommand, args, options.timeoutMs ?? 30000);
  return {
    id,
    title,
    status: result.exitCode === 0 ? "passed" : "failed",
    exitCode: result.exitCode,
    command: [docker.dockerCommand, ...args],
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
    timedOut: result.errorCode === "ETIMEDOUT"
  };
}

function runResourceLimitProbe() {
  const profile = tempProfile("iso-resource", {
    commands: { install: "node -e \"console.log('quota probe')\"", build: "npm run build", test: "npm test", start: "npm start" },
    resource_limits: { file_count: 5 }
  });
  const result = runProfileCommands(profile, { repoRoot });
  const install = result.commands.find(command => command.phase === "install");
  return {
    id: "ISO-07",
    title: "file count quota is detected and cleaned",
    status: result.status === "failed" && result.errors.includes("install workspace file count exceeded limit") && result.cleanup === "removed" ? "passed" : "failed",
    exitCode: install?.exitCode,
    errors: result.errors,
    cleanup: result.cleanup,
    resourceLimitExceeded: install?.resourceLimitExceeded
  };
}

function runTimeoutProbe() {
  const profile = tempProfile("iso-timeout", {
    commands: { install: "node -e \"setInterval(function(){}, 10000)\"", build: "npm run build", test: "npm test", start: "npm start" },
    resource_limits: { command_timeout_ms: 1000 }
  });
  const result = runProfileCommands(profile, { repoRoot });
  const install = result.commands.find(command => command.phase === "install");
  const containerName = install?.command?.[install.command.indexOf("--name") + 1];
  const leftover = containerName ? run(docker.dockerCommand, ["ps", "-a", "--filter", `name=${containerName}`, "--format", "{{.Names}}"], 10000).stdout.trim() : "missing-name";
  return {
    id: "ISO-08",
    title: "timeout terminates container and cleans temporary resources",
    status: result.status === "timeout" && result.cleanup === "removed" && install?.containerCleanup?.exitCode === 0 && leftover === "" ? "passed" : "failed",
    errors: result.errors,
    cleanup: result.cleanup,
    containerCleanupExitCode: install?.containerCleanup?.exitCode,
    leftover
  };
}

function runReplayProbe() {
  const repeatabilityPath = path.join(repoRoot, "artifacts", "m1-repeatability", "summary.json");
  const repeatability = JSON.parse(fs.readFileSync(repeatabilityPath, "utf8"));
  return {
    id: "ISO-13",
    title: "image digest and repeatability evidence are recorded",
    status: repeatability.status === "passed" && repeatability.unique_repeat_signatures === 1 && Boolean(imageDigest(docker.dockerCommand)) ? "passed" : "failed",
    repeatabilityStatus: repeatability.status,
    uniqueRepeatSignatures: repeatability.unique_repeat_signatures,
    imageDigest: imageDigest(docker.dockerCommand)
  };
}

function runCleanupFailureProbe() {
  const result = runLifecycleSmoke("samples/minimal-npm-api/vericrate.runner-profile.json", {
    repoRoot,
    removeTempRoot: () => {
      throw new Error("injected cleanup failure");
    }
  });
  fs.rmSync(result.tempRoot, { recursive: true, force: true });
  return {
    id: "ISO-14",
    title: "cleanup failure is visible and retryable",
    status: result.status === "passed" && result.cleanup === "failed" && /injected cleanup failure/.test(result.cleanupError ?? "") ? "passed" : "failed",
    runnerStatus: result.status,
    cleanup: result.cleanup,
    cleanupError: result.cleanupError
  };
}

function tempProfile(name, patch) {
  const profile = JSON.parse(fs.readFileSync(path.join(repoRoot, "samples", "minimal-npm-api", "vericrate.runner-profile.json"), "utf8"));
  profile.repo_path = "samples/minimal-npm-api";
  profile.commands = { ...profile.commands, ...patch.commands };
  profile.resource_limits = { ...profile.resource_limits, ...patch.resource_limits };
  const profilePath = path.join(tempRoot, `${name}.runner-profile.json`);
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  return profilePath;
}

function run(command, args, timeoutMs) {
  const env = { ...process.env };
  if (path.isAbsolute(command)) env.PATH = `${path.dirname(command)}${path.delimiter}${env.PATH ?? ""}`;
  const result = spawnSync(command, args, { encoding: "utf8", timeout: timeoutMs, env });
  return {
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    errorCode: result.error?.code
  };
}

function imageDigest(dockerCommand) {
  const result = run(dockerCommand, ["image", "inspect", image, "--format", "{{.Id}}"], 30000);
  return result.stdout.trim();
}

function tail(text) {
  return (text ?? "").split("\n").slice(-12).join("\n");
}

function networkProbeScript() {
  return "node -e \"const net=require('node:net');const targets=[['1.1.1.1',80],['127.0.0.1',80],['169.254.169.254',80]];let failed=0,done=0;for(const [host,port] of targets){const s=net.connect({host,port,timeout:500});const finish=ok=>{s.destroy();if(!ok)failed++;if(++done===targets.length)process.exit(failed===targets.length?0:1)};s.on('connect',()=>finish(true));s.on('error',()=>finish(false));s.on('timeout',()=>finish(false));}\"";
}

function renderReport(summary) {
  const rows = summary.records.map(record => `| ${record.id} | ${record.status} | ${record.title} |`).join("\n");
  return `# M1 Isolation Smoke Report

Status: ${summary.status}

- Docker: ${summary.docker_version}
- Docker server: ${summary.docker_server_version}
- Image digest: ${summary.image_digest}

| ID | Status | Smoke |
| --- | --- | --- |
${rows}
`;
}
