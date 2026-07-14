export const DEFAULT_CONTAINER_POLICY = {
  network: "none",
  user: "1000:1000",
  capDrop: "ALL",
  noNewPrivileges: true,
  pidsLimit: "64",
  memory: "256m",
  cpus: "1",
  readOnlyRoot: true,
  tmpfs: "/tmp:rw,noexec,nosuid,size=64m"
};

export function containerPolicyArgs(workspace, policy = DEFAULT_CONTAINER_POLICY, options = {}) {
  const workspaceMode = options.workspaceMode ?? "ro";
  const network = options.network ?? policy.network;
  const args = [
    "--network", network,
    "--user", policy.user,
    "--cap-drop", policy.capDrop,
    "--security-opt", "no-new-privileges",
    "--pids-limit", policy.pidsLimit,
    "--memory", policy.memory,
    "--cpus", policy.cpus
  ];
  if (policy.readOnlyRoot) args.push("--read-only");
  args.push(
    "--tmpfs", policy.tmpfs,
    "--env", "HOME=/tmp/agentproof-home",
    "--env", "COREPACK_HOME=/tmp/corepack",
    "--workdir", "/workspace",
    "--volume", `${workspace}:/workspace:${workspaceMode}`
  );
  if (options.cacheDir) args.push("--volume", `${options.cacheDir}:/agentproof-cache:rw`);
  return args;
}

export function lifecycleSmokeScript() {
  return [
    "node --version",
    "test -f package.json",
    "test \"$(id -u)\" = \"1000\"",
    "test ! -S /var/run/docker.sock",
    "test ! -e /root/.ssh",
    "test ! -e /workspace/.env",
    "test ! -e /workspace/.npmrc",
    "! touch /workspace/agentproof-write-test",
    "! touch /agentproof-root-write-test",
    "node -e \"const net=require('node:net');const s=net.connect({host:'1.1.1.1',port:80,timeout:1000});s.on('connect',()=>process.exit(1));s.on('error',()=>process.exit(0));s.on('timeout',()=>process.exit(0));\"",
    "echo agentproof-lifecycle-smoke-ok"
  ].join(" && ");
}

export function runnerCommand(command, packageManager) {
  const setup = [
    "export HOME=/workspace/.agentproof-home npm_config_nodedir=/usr/local",
    "if [ -d /agentproof-cache ]; then export COREPACK_HOME=/agentproof-cache/corepack PNPM_HOME=/agentproof-cache/pnpm-home pnpm_config_store_dir=/agentproof-cache/pnpm-store; else export COREPACK_HOME=/workspace/.agentproof-corepack PNPM_HOME=/workspace/.agentproof-pnpm-home pnpm_config_store_dir=/workspace/.agentproof-pnpm-store; fi",
    "mkdir -p \"$HOME\" \"$COREPACK_HOME\" \"$PNPM_HOME\" \"$pnpm_config_store_dir\""
  ].join(" && ");
  if (packageManager === "pnpm") return `${setup} && ${command.replace(/\bpnpm\b/g, "corepack pnpm")}`;
  return `${setup} && ${command}`;
}
