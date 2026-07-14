import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const allScenarios = [
  "superficial_completion",
  "authorization_bypass",
  "weakened_tests",
  "hardcoded_behavior",
  "non_persistent_state"
];
const requestedScenarios = process.argv.slice(2).filter((value) => value !== "--");
const scenarios = requestedScenarios.length > 0 ? requestedScenarios : allScenarios;

for (const scenario of scenarios) {
  if (!allScenarios.includes(scenario)) {
    throw new Error(`Unknown defect scenario: ${scenario}`);
  }
}

function run(command, args, options = {}) {
  const commandArgs =
    process.platform === "win32" && command.endsWith(".cmd")
      ? { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", command, ...args] }
      : { command, args };

  const result = spawnSync(commandArgs.command, commandArgs.args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: options.env ? { ...process.env, ...options.env } : process.env,
    shell: false
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    if (options.capture) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
    }
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
  return result;
}

function targetFilesAreClean() {
  const result = spawnSync("git", ["diff", "--quiet", "--", "src", "tests"], {
    cwd: root,
    shell: false
  });
  return result.status === 0;
}

function cleanupDatabase(name) {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(resolve(root, "prisma", `defect-${name}.db${suffix}`), { force: true });
  }
}

const results = [];

for (const scenario of scenarios) {
  if (!targetFilesAreClean()) {
    throw new Error("Refusing to apply a defect patch while src/ or tests/ already have unstaged changes.");
  }

  const patch = `defects/${scenario}/defect.patch`;
  const env = { DATABASE_URL: `file:./prisma/defect-${scenario}.db` };
  let applied = false;

  try {
    run("git", ["apply", "--directory=samples/demo-web-app", "--unidiff-zero", "--check", patch]);
    run("git", ["apply", "--directory=samples/demo-web-app", "--unidiff-zero", patch]);
    applied = true;

    if (scenario !== "weakened_tests") {
      run("node", ["scripts/init-db.mjs", "--reset"], { env });
    }
    const probe = run(resolve(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx"), ["scripts/probe-defect.mjs", scenario], {
      env,
      capture: true
    });
    const line = probe.stdout.trim().split(/\r?\n/).at(-1);
    results.push(JSON.parse(line));
    process.stdout.write(`${scenario}: reproduced\n`);
  } finally {
    if (applied) {
      run("git", ["apply", "--directory=samples/demo-web-app", "--unidiff-zero", "-R", patch]);
    }
    cleanupDatabase(scenario);
  }
}

if (!targetFilesAreClean()) {
  throw new Error("Defect verification did not restore src/ and tests/ to a clean state.");
}

console.log(JSON.stringify({ scenarios: results }, null, 2));
