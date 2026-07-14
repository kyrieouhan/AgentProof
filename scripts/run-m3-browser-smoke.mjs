#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { startBrowserEvidenceRecorder } from "../src/domain/browser-evidence.mjs";
import { runBrowserFlow } from "../src/domain/browser-flow.mjs";
import { demoTaskJoinedAssertion, evaluateJoinedAssertion } from "../src/domain/joined-assertions.mjs";
import { createEvidenceManifest, evidenceRef } from "../src/domain/manifest.mjs";
import { createVerificationReport, renderMarkdownReport } from "../src/domain/report.mjs";
import { DOMAIN_SCHEMA_VERSION } from "../src/domain/schemas.mjs";
import { createSmokeRunPaths } from "../src/runtime-paths.mjs";

const repoRoot = path.resolve(argValue("--repo-root") ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const demoRoot = path.resolve(argValue("--demo-root") ?? path.join(repoRoot, "samples", "demo-web-app"));
const runId = `m3-browser-${Date.now().toString(36)}`;
const runPaths = createSmokeRunPaths("m3-browser", runId);
const artifactDir = runPaths.run_dir;
const databasePath = path.join(runPaths.temp_dir, "demo-smoke.db");
const databaseEnv = { DATABASE_URL: sqliteFileUrl(databasePath) };

let server;
let browser;

try {
  cleanupDatabase(databasePath);
  run("node", ["scripts/init-db.mjs", "--reset"], { cwd: demoRoot, env: databaseEnv });

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  server = startServer(port);
  await waitForHealth(`${baseUrl}/health`);
  const executablePath = findBrowserExecutable();
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  const recorder = startBrowserEvidenceRecorder(page);
  const seed = Date.now().toString(36);
  const email = `m3-${seed}@example.test`;
  const taskTitle = `M3 browser smoke ${seed}`;
  const flow = demoBrowserFlow({ email, password: "CorrectHorse123!", taskTitle });
  const traceEnabled = process.env.AGENTPROOF_BROWSER_TRACE === "1";
  const tracePath = path.join(artifactDir, "trace.zip");
  if (traceEnabled) await page.context().tracing.start({ screenshots: true, snapshots: true, sources: false });
  const result = await runBrowserFlow(flow, { page, baseUrl });
  const joinedObservation = await collectDemoJoinedObservation(page, { taskTitle });
  writeJson("joined-observation.json", joinedObservation);
  const screenshotPath = path.join(artifactDir, "final-screen.png");
  await redactDomForScreenshot(page);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  if (traceEnabled) await page.context().tracing.stop({ path: tracePath });
  const browserEvents = recorder.stop();
  writeJson("browser-events.json", browserEvents.value);

  const evidence = [
    evidenceRef({
      evidence_id: "ev-browser-events",
      type: "browser_event_log",
      path: `smoke/m3-browser/${runId}/browser-events.json`,
      content: browserEvents.value
    }),
    evidenceRef({
      evidence_id: "ev-final-screen",
      type: "screenshot",
      path: `smoke/m3-browser/${runId}/final-screen.png`,
      content: fs.readFileSync(screenshotPath)
    }),
    evidenceRef({
      evidence_id: "ev-joined-observation",
      type: "joined_observation",
      path: `smoke/m3-browser/${runId}/joined-observation.json`,
      content: joinedObservation
    })
  ];
  if (traceEnabled) {
    evidence.push(evidenceRef({
      evidence_id: "ev-browser-trace",
      type: "browser_trace",
      path: `smoke/m3-browser/${runId}/trace.zip`,
      content: fs.readFileSync(tracePath)
    }));
  }

  const resultWithEvidence = { ...result, evidence };
  const joinedResult = evaluateJoinedAssertion(demoTaskJoinedAssertion({ taskTitle }), { ...joinedObservation, evidence: [evidence.find(item => item.evidence_id === "ev-joined-observation")] });
  const report = createVerificationReport({ run_id: runId, results: [resultWithEvidence, joinedResult] });
  const screenshotRedactions = ["screenshot:#session-state", "screenshot:input[type=email]", "screenshot:input[type=password]"];
  const redaction = {
    redacted_count: browserEvents.summary.redacted_count + screenshotRedactions.length,
    redacted_paths: [...browserEvents.summary.redacted_paths, ...screenshotRedactions]
  };
  const manifest = createEvidenceManifest({
    manifest_id: `manifest-${runId}`,
    generated_at: new Date().toISOString(),
    run: {
      schema_version: DOMAIN_SCHEMA_VERSION,
      run_id: runId,
      commit: readRunCommit(),
      runner_profile: "samples/demo-web-app/agentproof.runner-profile.json",
      image_digest: readIsolationDigest(),
      seed
    },
    evidence,
    redaction
  });
  const summary = {
    status: report.merge_recommendation === "recommend_merge" ? "passed" : "failed",
    run_id: runId,
    output_dir: artifactDir,
    summary_path: path.join(artifactDir, "summary.json"),
    schema_version: DOMAIN_SCHEMA_VERSION,
    base_url: baseUrl,
    browser: {
      executable_path: executablePath,
      version: browser.version()
    },
    flow: {
      flow_id: flow.flow_id,
      title: flow.title,
      step_count: flow.steps.length
    },
    test_data: {
      seed,
      email: "[REDACTED_EMAIL]",
      task_title: taskTitle
    },
    evidence: {
      files: evidence.map(item => item.path),
      trace: traceEnabled ? "captured" : "disabled_by_default",
      redaction
    },
    report
  };

  writeJson("manifest.json", manifest);
  writeJson("summary.json", summary);
  fs.writeFileSync(path.join(artifactDir, "report.md"), renderMarkdownReport(report), "utf8");
  console.log(JSON.stringify({ status: summary.status, run_id: runId, criteria: report.results.length, recommendation: report.merge_recommendation, summary_path: summary.summary_path, output_dir: summary.output_dir }, null, 2));
  if (summary.status !== "passed") process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await stopServer(server);
  cleanupDatabase(databasePath);
}

async function collectDemoJoinedObservation(page, { taskTitle }) {
  const taskListText = (await page.locator("#task-list").textContent()) ?? "";
  const api = await page.evaluate(async () => {
    const response = await fetch("/api/tasks");
    const json = await response.json();
    return {
      status: response.status,
      tasks: (json.tasks ?? []).map(task => ({ title: task.title, completed: task.completed }))
    };
  });
  const databaseTasks = readDemoTasks();
  const apiTask = api.tasks.find(task => task.title === taskTitle);
  const databaseTask = databaseTasks.find(task => task.title === taskTitle);

  return {
    page: {
      task_visible: taskListText.includes(taskTitle)
    },
    api: {
      status: api.status,
      task_title: apiTask?.title ?? null,
      completed: apiTask?.completed ?? null,
      task_count: api.tasks.length
    },
    database: {
      task_title: databaseTask?.title ?? null,
      completed: databaseTask?.completed ?? null,
      task_count: databaseTasks.length
    }
  };
}

function readDemoTasks() {
  const requireFromDemo = createRequire(path.join(demoRoot, "package.json"));
  const Database = requireFromDemo("better-sqlite3");
  const db = new Database(databasePath, { readonly: true });
  try {
    return db.prepare('SELECT title, completed FROM "Task" ORDER BY id ASC').all().map(row => ({
      title: row.title,
      completed: Boolean(row.completed)
    }));
  } finally {
    db.close();
  }
}

function demoBrowserFlow({ email, password, taskTitle }) {
  return {
    schema_version: DOMAIN_SCHEMA_VERSION,
    flow_id: "demo-browser-register-task-admin-denied",
    title: "Register, create task, and verify admin denial",
    timeout_ms: 7000,
    steps: [
      { action: "goto", path: "/" },
      { action: "fill", target: { strategy: "css", selector: "#register-form input[name=email]" }, value: email },
      { action: "fill", target: { strategy: "css", selector: "#register-form input[name=password]" }, value: password },
      { action: "click", target: { strategy: "role", role: "button", name: "Create account" } },
      { action: "expect_text", target: { strategy: "css", selector: "#status" }, text: "Registration succeeded" },
      { action: "expect_text", target: { strategy: "css", selector: "#session-state" }, text: `Logged in as ${email}` },
      { action: "fill", target: { strategy: "css", selector: "#task-form input[name=title]" }, value: taskTitle },
      { action: "click", target: { strategy: "role", role: "button", name: "Save task" } },
      { action: "expect_text", target: { strategy: "css", selector: "#status" }, text: "Task saved to SQLite." },
      { action: "expect_text", target: { strategy: "css", selector: "#task-list" }, text: taskTitle },
      { action: "click", target: { strategy: "role", role: "button", name: "Call admin API" } },
      { action: "expect_text", target: { strategy: "css", selector: "#status" }, text: "Admin access required." }
    ]
  };
}

function startServer(port) {
  const child = spawn(process.execPath, [tsxCli(), "src/server.ts"], {
    cwd: demoRoot,
    env: { ...process.env, ...databaseEnv, HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  return child;
}

async function redactDomForScreenshot(page) {
  await page.evaluate(() => {
    for (const input of document.querySelectorAll("input[type=email]")) input.value = input.value ? "[REDACTED_EMAIL]" : "";
    for (const input of document.querySelectorAll("input[type=password]")) input.value = "";
    const session = document.querySelector("#session-state");
    if (session) session.textContent = session.textContent.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
  });
}

async function waitForHealth(url) {
  const started = Date.now();
  let lastError = "";
  do {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await pause(200);
  } while (Date.now() - started < 10000);
  throw new Error(`Demo server did not become healthy: ${lastError}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise(resolve => child.once("exit", resolve));
}

function run(command, args, options) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.command, spec.args, {
    cwd: options.cwd,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    encoding: "utf8",
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${[command, ...args].join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
}

function commandOutput(command, args, options) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.command, spec.args, {
    cwd: options.cwd,
    encoding: "utf8",
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${[command, ...args].join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  return result.stdout;
}

function commandSpec(command, args) {
  if (process.platform === "win32" && command.endsWith(".cmd")) {
    return { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }
  return { command, args };
}

function tsxCli() {
  return path.join(demoRoot, "node_modules", "tsx", "dist", "cli.mjs");
}

function findBrowserExecutable() {
  const windowsRoots = [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA
  ].filter(Boolean);
  const candidates = [
    process.env.CHROME_PATH,
    ...windowsRoots.flatMap(root => [
      path.join(root, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(root, "Microsoft", "Edge", "Application", "msedge.exe")
    ]),
    path.join("/", "usr", "bin", "google-chrome"),
    path.join("/", "usr", "bin", "chromium"),
    path.join("/", "usr", "bin", "chromium-browser"),
    path.join("/", "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome")
  ].filter(Boolean);
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) throw new Error("Chrome or Edge executable not found. Set CHROME_PATH.");
  return found;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function cleanupDatabase(file) {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    fs.rmSync(`${file}${suffix}`, { force: true, maxRetries: 10, retryDelay: 100 });
  }
}

function sqliteFileUrl(file) {
  return `file:${path.resolve(file).replaceAll(path.sep, "/")}`;
}

function readIsolationDigest() {
  const summaryPath = path.join(repoRoot, "artifacts", "m1-isolation-smoke", "summary.json");
  if (!fs.existsSync(summaryPath)) return `sha256:${"0".repeat(64)}`;
  return JSON.parse(fs.readFileSync(summaryPath, "utf8")).image_digest;
}

function readRunCommit() {
  try {
    return commandOutput("git", ["rev-parse", "HEAD"], { cwd: repoRoot }).trim();
  } catch {
    try {
      return `desktop-package-${JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).version ?? "unknown"}`;
    } catch {
      return "unknown";
    }
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(artifactDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
