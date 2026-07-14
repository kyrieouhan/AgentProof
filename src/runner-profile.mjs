import fs from "node:fs";
import path from "node:path";

const SCHEMA_VERSION = "1.0.0-m1";
const SENSITIVE_ENV_NAME = /(TOKEN|SECRET|PASSWORD|COOKIE|PRIVATE|CREDENTIAL|AUTH|KEY)$/i;

export function loadRunnerProfile(profilePath) {
  const absolutePath = path.resolve(profilePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

export function validateRunnerProfile(profile, options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const errors = [];

  if (!isPlainObject(profile)) {
    return { valid: false, errors: ["profile must be a JSON object"] };
  }

  requireValue(profile.schema_version === SCHEMA_VERSION, "schema_version must be 1.0.0-m1", errors);
  requireString(profile.repo_path, "repo_path", errors);
  requireString(profile.commit, "commit", errors);
  requireString(profile.image, "image", errors);
  requireString(profile.workdir, "workdir", errors);
  requireValue(profile.node_version === "20", "node_version must be 20", errors);
  requireValue(profile.package_manager === "npm" || profile.package_manager === "pnpm", "package_manager must be npm or pnpm", errors);

  validateCommands(profile.commands, errors);
  validateHealthcheck(profile.healthcheck, errors);
  validatePort(profile.port, errors);
  validateEnvAllowlist(profile.env_allowlist, errors);
  validateResourceLimits(profile.resource_limits, errors);
  validateNetworkPolicy(profile.network_policy, errors);
  validateMountPolicy(profile.mount_policy, errors);
  validateEvidencePolicy(profile.evidence_policy, errors);

  if (typeof profile.repo_path === "string" && typeof profile.workdir === "string") {
    validatePathsAndPackage(profile, repoRoot, errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateRunnerProfileFile(profilePath, options = {}) {
  const profile = loadRunnerProfile(profilePath);
  return validateRunnerProfile(profile, options);
}

function validateCommands(commands, errors) {
  if (!isPlainObject(commands)) {
    errors.push("commands must be an object");
    return;
  }
  for (const name of ["install", "build", "start"]) {
    requireString(commands[name], `commands.${name}`, errors);
  }
  if (Array.isArray(commands.test)) {
    requireValue(commands.test.length === 0, "commands.test array must be empty when tests are intentionally unavailable", errors);
  } else {
    requireString(commands.test, "commands.test", errors);
  }
}

function validateHealthcheck(healthcheck, errors) {
  if (!isPlainObject(healthcheck)) {
    errors.push("healthcheck must be an object");
    return;
  }
  requireValue(healthcheck.method === "GET" || healthcheck.method === "POST", "healthcheck.method must be GET or POST", errors);
  requireValue(typeof healthcheck.path === "string" && healthcheck.path.startsWith("/"), "healthcheck.path must start with /", errors);
  validateIntegerRange(healthcheck.expected_status, "healthcheck.expected_status", 100, 599, errors);
  validateIntegerRange(healthcheck.timeout_ms, "healthcheck.timeout_ms", 1, Number.MAX_SAFE_INTEGER, errors);
  validateIntegerRange(healthcheck.retries, "healthcheck.retries", 1, Number.MAX_SAFE_INTEGER, errors);
}

function validatePort(port, errors) {
  validateIntegerRange(port, "port", 1, 65535, errors);
}

function validateEnvAllowlist(envAllowlist, errors) {
  if (!Array.isArray(envAllowlist)) {
    errors.push("env_allowlist must be an array");
    return;
  }
  for (const [index, entry] of envAllowlist.entries()) {
    if (!isPlainObject(entry)) {
      errors.push(`env_allowlist[${index}] must be an object`);
      continue;
    }
    if (typeof entry.name !== "string" || !/^[A-Z_][A-Z0-9_]*$/.test(entry.name)) {
      errors.push(`env_allowlist[${index}].name must be an uppercase environment variable name`);
    }
    if (!["runner", "temporary_file", "temporary_value"].includes(entry.source)) {
      errors.push(`env_allowlist[${index}].source must be runner, temporary_file, or temporary_value`);
    }
    if (Object.hasOwn(entry, "value") && SENSITIVE_ENV_NAME.test(entry.name)) {
      errors.push(`env_allowlist[${index}].value must not inline sensitive-looking ${entry.name}`);
    }
  }
}

function validateResourceLimits(limits, errors) {
  if (!isPlainObject(limits)) {
    errors.push("resource_limits must be an object");
    return;
  }
  requireString(limits.cpu, "resource_limits.cpu", errors);
  validateIntegerRange(limits.memory_mb, "resource_limits.memory_mb", 128, Number.MAX_SAFE_INTEGER, errors);
  validateIntegerRange(limits.pids, "resource_limits.pids", 16, Number.MAX_SAFE_INTEGER, errors);
  validateIntegerRange(limits.disk_mb, "resource_limits.disk_mb", 128, Number.MAX_SAFE_INTEGER, errors);
  validateIntegerRange(limits.file_count, "resource_limits.file_count", 1, Number.MAX_SAFE_INTEGER, errors);
  validateIntegerRange(limits.stdout_stderr_mb, "resource_limits.stdout_stderr_mb", 1, Number.MAX_SAFE_INTEGER, errors);
  validateIntegerRange(limits.command_timeout_ms, "resource_limits.command_timeout_ms", 1000, Number.MAX_SAFE_INTEGER, errors);
  validateIntegerRange(limits.service_start_timeout_ms, "resource_limits.service_start_timeout_ms", 1000, Number.MAX_SAFE_INTEGER, errors);
}

function validateNetworkPolicy(policy, errors) {
  if (!isPlainObject(policy)) {
    errors.push("network_policy must be an object");
    return;
  }
  requireValue(policy.default === "deny", "network_policy.default must be deny", errors);
  requireValue(["restricted_dependency_sources", "deny"].includes(policy.install_phase), "network_policy.install_phase must be restricted_dependency_sources or deny", errors);
}

function validateMountPolicy(policy, errors) {
  if (!isPlainObject(policy)) {
    errors.push("mount_policy must be an object");
    return;
  }
  const required = {
    docker_socket: "forbidden",
    host_home: "forbidden",
    ssh_keys: "forbidden",
    real_env_files: "forbidden",
    rules: "read_only",
    workspace: "temporary_copy"
  };
  for (const [key, value] of Object.entries(required)) {
    requireValue(policy[key] === value, `mount_policy.${key} must be ${value}`, errors);
  }
}

function validateEvidencePolicy(policy, errors) {
  if (!isPlainObject(policy)) {
    errors.push("evidence_policy must be an object");
    return;
  }
  for (const key of ["capture_stdout_stderr", "hash_outputs", "redact_secrets", "treat_target_outputs_as_untrusted"]) {
    requireValue(policy[key] === true, `evidence_policy.${key} must be true`, errors);
  }
}

function validatePathsAndPackage(profile, repoRoot, errors) {
  if (!isSafeRelativePath(profile.repo_path)) {
    errors.push("repo_path must be a relative path inside repo root");
    return;
  }
  if (!isSafeRelativePath(profile.workdir)) {
    errors.push("workdir must be a relative path inside repo_path");
    return;
  }

  const repoPath = path.resolve(repoRoot, profile.repo_path);
  const workdirPath = path.resolve(repoPath, profile.workdir);
  if (!isInside(repoRoot, repoPath)) {
    errors.push("repo_path must stay inside repo root");
  }
  if (!isInside(repoPath, workdirPath)) {
    errors.push("workdir must stay inside repo_path");
  }
  if (!fs.existsSync(workdirPath)) {
    errors.push(`workdir does not exist: ${path.relative(repoRoot, workdirPath)}`);
    return;
  }

  const packageJsonPath = path.join(workdirPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    errors.push("workdir must contain package.json");
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  if (profile.package_manager === "npm" && !fs.existsSync(path.join(workdirPath, "package-lock.json"))) {
    errors.push("npm package_manager requires package-lock.json");
  }
  if (profile.package_manager === "pnpm") {
    if (!fs.existsSync(path.join(workdirPath, "pnpm-lock.yaml"))) {
      errors.push("pnpm package_manager requires pnpm-lock.yaml");
    }
    if (typeof packageJson.packageManager !== "string" || !packageJson.packageManager.startsWith("pnpm@")) {
      errors.push("pnpm package_manager requires package.json packageManager starting with pnpm@");
    }
  }
}

function requireString(value, name, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${name} must be a non-empty string`);
  }
}

function requireValue(condition, message, errors) {
  if (!condition) errors.push(message);
}

function validateIntegerRange(value, name, min, max, errors) {
  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${name} must be an integer between ${min} and ${max}`);
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeRelativePath(value) {
  return typeof value === "string" && value !== "" && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes("..");
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
