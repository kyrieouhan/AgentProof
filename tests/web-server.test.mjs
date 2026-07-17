import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { startWebServer } from "../src/web/server.mjs";

test("web server reports invalid paths and Docker infrastructure errors", async () => {
  const dataDir = tempPath("vericrate-web-infra");
  const app = await startWebServer({ port: 0, repoRoot: process.cwd(), dataDir, dockerCommand: "__vericrate_missing_docker__" });
  try {
    const example = await get(`${app.url}/api/example`);
    assert.equal(example.status, 200);
    assert.match(example.body.example.requirement, /官方 Demo/);
    assert.equal(example.body.example.criteria.length, 2);

    const invalid = await post(`${app.url}/api/project`, { path: path.join(process.cwd(), "definitely-not-vericrate") });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /不存在/);

    const demoPath = path.resolve("samples/demo-web-app");
    const project = await post(`${app.url}/api/project`, { path: demoPath });
    assert.equal(project.status, 200);
    assert.equal(project.body.project.name, "demo-web-app");
    assert.equal(project.body.project.runner_profile.valid, true);

    const emptyCriteria = await post(`${app.url}/api/runs`, {
      project_path: demoPath,
      requirement: "Verify demo registration.",
      criteria: []
    });
    assert.equal(emptyCriteria.status, 400);
    assert.match(emptyCriteria.body.error, /至少添加一个验收项/);

    const started = await post(`${app.url}/api/runs`, {
      project_path: demoPath,
      requirement: "Verify demo registration.",
      criteria: [{
        criterion_id: "demo-browser-register-task-admin-denied",
        title: "Demo browser flow",
        description: "Registration and task creation should work.",
        severity: "high",
        status: "user_confirmed"
      }]
    });
    assert.equal(started.status, 202);
    const run = await waitForRun(app.url, started.body.run_id);
    assert.equal(run.status, "infrastructure_error");
    assert.equal(run.report.status_counts.infrastructure_error, 1);
    assert.equal(run.report.merge_recommendation, "indeterminate");
    assert.equal(fs.existsSync(path.join(dataDir, "runs", started.body.run_id, "summary.json")), true);
  } finally {
    await close(app.server);
  }
});

test("desktop session token protects APIs, reports, and evidence", async () => {
  const dataDir = tempPath("vericrate-web-token");
  const app = await startWebServer({ port: 0, repoRoot: process.cwd(), dataDir, accessToken: "desktop-secret-token" });
  const runDir = path.join(dataDir, "runs", "token-run");
  const evidenceDir = path.join(runDir, "evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "report.html"), "<h1>report</h1>", "utf8");
  fs.writeFileSync(path.join(evidenceDir, "final-screen.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  app.jobs.set("token-run", {
    run_id: "token-run",
    artifact_dir: runDir,
    evidence: [{ file: "final-screen.png", content_type: "image/png" }]
  });
  try {
    assert.equal((await get(`${app.url}/health`)).status, 200);
    assert.equal((await get(`${app.url}/api/example`)).status, 401);
    assert.equal((await get(`${app.url}/api/example`, "wrong-token")).status, 401);
    const authorized = await get(`${app.url}/api/example`, "desktop-secret-token");
    assert.equal(authorized.status, 200);
    assert.match(authorized.body.example.requirement, /官方 Demo/);

    assert.equal((await fetch(`${app.url}/api/runs/token-run/report.html`)).status, 401);
    assert.equal((await fetch(`${app.url}/api/runs/token-run/evidence/final-screen.png`)).status, 401);

    const report = await fetch(`${app.url}/api/runs/token-run/report.html`, { headers: auth("desktop-secret-token") });
    assert.equal(report.status, 200);
    assert.match(await report.text(), /report/);

    const evidence = await fetch(`${app.url}/api/runs/token-run/evidence/final-screen.png`, { headers: auth("desktop-secret-token") });
    assert.equal(evidence.status, 200);
    assert.equal(evidence.headers.get("content-type"), "image/png");
  } finally {
    await close(app.server);
  }
});

test("non-official projects do not run the official demo browser flow", async () => {
  const repo = createMinimalGitProject();
  const dataDir = tempPath("vericrate-web-generic");
  const before = gitStatus(repo);
  const calls = [];
  const app = await startWebServer({
    port: 0,
    repoRoot: process.cwd(),
    dataDir,
    dockerCheck: () => ({ status: "passed", dockerCommand: "docker", version: "Docker version 29.0.0", serverVersion: "29.0.0", errors: [] }),
    commandRunner: async (_cwd, args) => {
      calls.push(args.join(" "));
      if (args.some(arg => arg.includes("run-m3-browser-smoke.mjs"))) throw new Error("official demo browser flow must not run for generic projects");
      return runnerSuccess();
    }
  });
  try {
    const started = await post(`${app.url}/api/runs`, {
      project_path: repo,
      requirement: "Generic project should build and test.",
      criteria: [{
        criterion_id: "generic-behavior",
        title: "Generic behavior",
        description: "A project-specific behavior check would be needed.",
        severity: "high",
        status: "user_confirmed"
      }]
    });
    const run = await waitForRun(app.url, started.body.run_id);
    assert.equal(run.status, "unverifiable");
    assert.equal(run.report.merge_recommendation, "human_review");
    assert.equal(run.report.status_counts.unverifiable, 1);
    assert.equal(run.stages.find(stage => stage.id === "browser").status, "unverifiable");
    assert.equal(run.stages.find(stage => stage.id === "api").status, "unverifiable");
    assert.equal(run.stages.find(stage => stage.id === "database").status, "unverifiable");
    assert.equal(calls.some(call => call.includes("run-m3-browser-smoke.mjs")), false);
    assert.equal(gitStatus(repo), before);
  } finally {
    await close(app.server);
  }
});

test("official demo reports and evidence are served from the VeriCrate data directory", async () => {
  const dataDir = tempPath("vericrate-web-demo");
  const app = await startWebServer({
    port: 0,
    repoRoot: process.cwd(),
    dataDir,
    dockerCheck: () => ({ status: "passed", dockerCommand: "docker", version: "Docker version 29.0.0", serverVersion: "29.0.0", errors: [] }),
    commandRunner: async (_cwd, args) => {
      if (args.some(arg => arg.includes("run-m3-browser-smoke.mjs"))) return browserSuccess(dataDir);
      return runnerSuccess();
    }
  });
  try {
    const started = await post(`${app.url}/api/runs`, {
      project_path: path.resolve("samples/demo-web-app"),
      requirement: "Verify official demo.",
      criteria: [{
        criterion_id: "demo-browser-register-task-admin-denied",
        title: "Demo browser flow",
        description: "Registration and task creation should work.",
        severity: "high",
        status: "user_confirmed"
      }]
    });
    const run = await waitForRun(app.url, started.body.run_id);
    assert.equal(run.status, "passed");
    assert.equal(run.report.merge_recommendation, "recommend_merge");
    assert.equal(run.evidence.some(item => item.file === "final-screen.png"), true);

    const html = await fetch(`${app.url}${run.report_urls.html}`);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /VeriCrate 验收报告/);

    const evidence = await fetch(`${app.url}/api/runs/${run.run_id}/evidence/final-screen.png`);
    assert.equal(evidence.status, 200);
    assert.equal(evidence.headers.get("content-type"), "image/png");

    const outside = await fetch(`${app.url}/api/runs/${run.run_id}/evidence/..%2Fsummary.json`);
    assert.equal(outside.status, 404);
  } finally {
    await close(app.server);
  }
});

async function get(url, token) {
  const response = await fetch(url, { headers: token ? auth(token) : {} });
  return { status: response.status, body: await response.json() };
}

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function waitForRun(baseUrl, runId) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    const response = await fetch(`${baseUrl}/api/runs/${runId}`);
    const run = await response.json();
    if (!["queued", "running"].includes(run.status)) return run;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for run.");
}

function close(server) {
  return new Promise(resolve => server.close(resolve));
}

function tempPath(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function createMinimalGitProject() {
  const repo = tempPath("vericrate-generic-project");
  fs.writeFileSync(path.join(repo, "package.json"), `${JSON.stringify({ name: "generic-project", version: "1.0.0" }, null, 2)}\n`);
  fs.writeFileSync(path.join(repo, "package-lock.json"), `${JSON.stringify({ name: "generic-project", version: "1.0.0", lockfileVersion: 3, packages: { "": { name: "generic-project", version: "1.0.0" } } }, null, 2)}\n`);
  fs.writeFileSync(path.join(repo, "vericrate.runner-profile.json"), `${JSON.stringify(minimalProfile(), null, 2)}\n`);
  runGit(repo, ["init"]);
  runGit(repo, ["config", "user.name", "VeriCrate Test"]);
  runGit(repo, ["config", "user.email", "vericrate@example.invalid"]);
  runGit(repo, ["add", "."]);
  runGit(repo, ["commit", "-m", "init"]);
  return repo;
}

function minimalProfile() {
  return {
    schema_version: "1.0.0-m1",
    repo_path: ".",
    commit: "HEAD",
    image: "node:20-bookworm",
    workdir: ".",
    node_version: "20",
    package_manager: "npm",
    commands: { install: "npm ci", build: "npm run build", test: "npm test", start: "npm start" },
    healthcheck: { method: "GET", path: "/health", expected_status: 200, timeout_ms: 1000, retries: 1 },
    port: 3000,
    env_allowlist: [],
    resource_limits: { cpu: "1", memory_mb: 512, pids: 128, disk_mb: 512, file_count: 1000, stdout_stderr_mb: 5, command_timeout_ms: 1000, service_start_timeout_ms: 1000 },
    network_policy: { default: "deny", install_phase: "restricted_dependency_sources" },
    mount_policy: { docker_socket: "forbidden", host_home: "forbidden", ssh_keys: "forbidden", real_env_files: "forbidden", rules: "read_only", workspace: "temporary_copy" },
    evidence_policy: { capture_stdout_stderr: true, hash_outputs: true, redact_secrets: true, treat_target_outputs_as_untrusted: true }
  };
}

function runnerSuccess() {
  return {
    exitCode: 0,
    durationMs: 1,
    stderr: "",
    stdout: `${JSON.stringify({
      status: "passed",
      runId: "fake-runner",
      cleanup: "removed",
      errors: [],
      commands: ["install", "build", "test"].map(phase => ({ phase, exitCode: 0, durationMs: 1, stdout: "", stderr: "" }))
    }, null, 2)}\n`
  };
}

function browserSuccess(dataDir) {
  const outputDir = path.join(dataDir, "smoke", "m3-browser", "fake-browser");
  fs.mkdirSync(outputDir, { recursive: true });
  const report = {
    schema_version: "1.0.0-m3",
    run_id: "fake-browser",
    results: [
      { criterion_id: "demo-browser-register-task-admin-denied", status: "passed", summary: "Browser flow passed", evidence: [], errors: [], blocking_security_issue: false },
      { criterion_id: "demo-page-api-db-task-consistency", status: "passed", summary: "Page, API, and database observations matched", evidence: [], errors: [], blocking_security_issue: false }
    ],
    status_counts: { passed: 2, failed: 0, insufficient_spec: 0, infrastructure_error: 0, unverifiable: 0, unstable: 0 },
    merge_recommendation: "recommend_merge"
  };
  const summary = { run_id: "fake-browser", status: "passed", output_dir: outputDir, summary_path: path.join(outputDir, "summary.json"), report };
  for (const [file, content] of Object.entries({
    "browser-events.json": "{}\n",
    "joined-observation.json": "{}\n",
    "manifest.json": "{}\n",
    "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
    "report.md": "# fake\n"
  })) fs.writeFileSync(path.join(outputDir, file), content);
  fs.writeFileSync(path.join(outputDir, "final-screen.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return { exitCode: 0, durationMs: 1, stderr: "", stdout: `${JSON.stringify({ status: "passed", summary_path: summary.summary_path, output_dir: outputDir }, null, 2)}\n` };
}

function runGit(cwd, args) {
  const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}

function gitStatus(cwd) {
  return runGit(cwd, ["status", "--short"]).trim();
}

function auth(token) {
  return { "x-vericrate-session": token };
}
