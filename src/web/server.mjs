import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkDocker } from "../docker-preflight.mjs";
import { validateRunnerProfile } from "../runner-profile.mjs";
import { createVerificationReport, renderHtmlReport, renderMarkdownReport } from "../domain/report.mjs";
import { createRunPaths } from "../runtime-paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = path.join(__dirname, "static");
const DEFAULT_PORT = 4173;
const MAX_BODY_BYTES = 128 * 1024;
const OFFICIAL_DEMO_TOKEN = "__AGENTPROOF_OFFICIAL_DEMO__";

export const DEFAULT_WEB_CRITERIA = Object.freeze([
  {
    criterion_id: "demo-browser-register-task-admin-denied",
    title: "注册后保持登录、创建任务并拒绝普通用户访问管理员接口",
    description: "官方 Demo 应允许用户注册、保持登录状态、保存任务，并在普通用户访问管理员接口时返回拒绝结果。",
    severity: "high",
    status: "user_confirmed"
  },
  {
    criterion_id: "demo-page-api-db-task-consistency",
    title: "页面、API 和 SQLite 中的任务数据一致",
    description: "同一条任务应同时出现在页面、已登录 API 响应和 SQLite 数据库中。",
    severity: "high",
    status: "user_confirmed"
  }
]);

export const DEFAULT_WEB_EXAMPLE = Object.freeze({
  requirement: "验证官方 Demo 的注册流程：邮箱标准化后保持唯一、注册后建立登录状态、任务可以持久保存、普通用户不能访问管理员接口。",
  criteria: DEFAULT_WEB_CRITERIA
});

export function createWebServer(options = {}) {
  const agentproofRoot = path.resolve(options.repoRoot ?? process.cwd());
  const jobs = new Map();
  const activeKeys = new Map();
  const dockerCommand = options.dockerCommand ?? process.env.AGENTPROOF_WEB_DOCKER ?? process.env.AGENTPROOF_DOCKER;
  const dataDir = options.dataDir;
  const accessToken = options.accessToken;
  const officialDemoRoot = options.officialDemoRoot ? path.resolve(options.officialDemoRoot) : null;
  const desktopMode = options.desktopMode === true;
  const dockerCheck = options.dockerCheck ?? ((input) => checkDocker(input));
  const commandRunner = options.commandRunner ?? ((cwd, args, env) => runNode(cwd, args, env));

  const server = http.createServer(async (request, response) => {
    try {
      await route({ request, response, agentproofRoot, jobs, activeKeys, dockerCommand, dataDir, accessToken, officialDemoRoot, desktopMode, dockerCheck, commandRunner });
    } catch (error) {
      respondJson(response, error.statusCode ?? 500, { error: error.message });
    }
  });

  return { server, jobs };
}

export function startWebServer(options = {}) {
  const host = options.host ?? process.env.HOST ?? "127.0.0.1";
  const port = Number(options.port ?? process.env.PORT ?? DEFAULT_PORT);
  const web = createWebServer(options);
  return new Promise((resolve, reject) => {
    web.server.once("error", reject);
    web.server.listen(port, host, () => {
      const address = web.server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      resolve({ ...web, host, port: actualPort, url: `http://${host}:${actualPort}` });
    });
  });
}

async function route(context) {
  const { request, response } = context;
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const method = request.method ?? "GET";

  if (method === "GET" && url.pathname === "/health") return respondJson(response, 200, { status: "ok" });
  if (context.accessToken && protectedRoute(url.pathname) && !authorized(request, context.accessToken)) return respondJson(response, 401, { error: "未授权的桌面会话请求。" });
  if (method === "GET" && url.pathname === "/api/desktop-info") return respondJson(response, 200, { desktop: context.desktopMode, official_demo_available: Boolean(context.officialDemoRoot) });
  if (method === "GET" && url.pathname === "/api/example") return respondJson(response, 200, { example: DEFAULT_WEB_EXAMPLE });
  if (method === "GET" && url.pathname === "/api/default-criteria") return respondJson(response, 200, { criteria: DEFAULT_WEB_CRITERIA });
  if (method === "POST" && url.pathname === "/api/project") return handleProject(context);
  if (method === "POST" && url.pathname === "/api/runs") return handleStartRun(context);
  if (method === "GET" && /^\/api\/runs\/[^/]+$/.test(url.pathname)) return handleGetRun(context, runIdFrom(url.pathname));
  if (method === "GET" && /^\/api\/runs\/[^/]+\/report\.(html|md)$/.test(url.pathname)) return handleReport(context, url.pathname);
  if (method === "GET" && /^\/api\/runs\/[^/]+\/evidence\/[^/]+$/.test(url.pathname)) return handleEvidence(context, url.pathname);
  if (method === "GET") return serveStatic(response, url.pathname);

  respondJson(response, 404, { error: "未找到请求的资源。" });
}

async function handleProject({ request, response, agentproofRoot, officialDemoRoot }) {
  const body = await readJson(request);
  const project = inspectProject(body.path, { agentproofRoot, officialDemoRoot });
  respondJson(response, 200, { project });
}

async function handleStartRun(context) {
  const { request, response, agentproofRoot, jobs, activeKeys, dataDir, officialDemoRoot } = context;
  const body = await readJson(request);
  const project = inspectProject(body.project_path, { agentproofRoot, officialDemoRoot });
  if (!project.runner_profile) return respondJson(response, 400, { error: "未找到该项目的 Runner Profile。" });
  if (!project.runner_profile.valid) return respondJson(response, 400, { error: "Runner Profile 无效。", details: project.runner_profile.errors });

  const criteria = normalizeCriteria(body.criteria);
  if (!criteria.length) return respondJson(response, 400, { error: "请至少添加一个验收项或加载示例。" });
  const requirement = String(body.requirement ?? "").trim();
  const key = hashJson({ project: project.git_root, profile: project.runner_profile.path, requirement, criteria });
  const existing = activeKeys.get(key);
  if (existing && jobs.get(existing)?.status === "running") return respondJson(response, 202, { run_id: existing, duplicate_of: existing });

  const runId = `web-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const paths = createRunPaths(runId, { dataDir });
  const job = {
    run_id: runId,
    status: "queued",
    current_stage: "queued",
    project,
    requirement,
    criteria,
    stages: [
      stage("project", "passed", "项目已导入。"),
      stage("docker", "pending", "等待 Docker 预检。"),
      stage("install", "pending", "等待安装依赖。"),
      stage("build", "pending", "等待构建项目。"),
      stage("test", "pending", "等待运行测试。"),
      stage("start", "pending", "等待启动目标服务。"),
      stage("api", "pending", "等待 API 验证。"),
      stage("browser", "pending", "等待浏览器验证。"),
      stage("database", "pending", "等待数据库验证。"),
      stage("report", "pending", "等待生成报告。")
    ],
    logs: [],
    evidence: [],
    report: null,
    report_urls: null,
    paths,
    artifact_dir: paths.run_dir,
    created_at: new Date().toISOString()
  };
  jobs.set(runId, job);
  activeKeys.set(key, runId);
  setImmediate(() => runJob(job, context).catch(error => {
    finishJob(job, "infrastructure_error", [{
      criterion_id: "web-internal-error",
      status: "infrastructure_error",
      summary: "AgentProof 本地 Web 验收运行异常中止。",
      evidence: [],
      errors: [error.message],
      blocking_security_issue: false
    }]);
  }).finally(() => activeKeys.delete(key)));
  respondJson(response, 202, { run_id: runId });
}

function handleGetRun({ response, jobs }, runId) {
  const job = jobs.get(runId);
  if (!job) return respondJson(response, 404, { error: "未找到该验收运行。" });
  respondJson(response, 200, publicJob(job));
}

function handleReport({ response, jobs }, pathname) {
  const [, , , runId, reportFile] = pathname.split("/");
  const job = jobs.get(runId);
  if (!job?.artifact_dir) return respondJson(response, 404, { error: "未找到报告。" });
  const file = path.join(job.artifact_dir, reportFile);
  if (!isInside(job.artifact_dir, file) || !fs.existsSync(file)) return respondJson(response, 404, { error: "未找到报告。" });
  const type = reportFile.endsWith(".html") ? "text/html; charset=utf-8" : "text/markdown; charset=utf-8";
  response.writeHead(200, {
    "content-type": type,
    "content-disposition": reportFile.endsWith(".md") ? `attachment; filename="${runId}-report.md"` : "inline"
  });
  fs.createReadStream(file).pipe(response);
}

function handleEvidence({ response, jobs }, pathname) {
  const [, , , runId, , fileName] = pathname.split("/");
  const job = jobs.get(runId);
  const item = job?.evidence?.find(entry => entry.file === fileName);
  if (!job?.artifact_dir || !item) return respondJson(response, 404, { error: "未找到证据文件。" });
  const file = path.join(job.artifact_dir, "evidence", fileName);
  if (!isInside(path.join(job.artifact_dir, "evidence"), file) || !fs.existsSync(file)) return respondJson(response, 404, { error: "未找到证据文件。" });
  response.writeHead(200, { "content-type": item.content_type });
  fs.createReadStream(file).pipe(response);
}

async function runJob(job, { agentproofRoot, dockerCommand, dockerCheck, commandRunner }) {
  job.status = "running";
  job.current_stage = "docker";
  updateStage(job, "docker", "running", "正在检查 Docker Desktop 和 Docker Engine。");
  const docker = dockerCheck(dockerCommand ? { docker: dockerCommand } : {});
  if (docker.status !== "passed") {
    updateStage(job, "docker", "infrastructure_error", docker.errors?.join("; ") || "Docker 预检失败。");
    return finishJob(job, "infrastructure_error", [{
      criterion_id: "web-docker-preflight",
      status: "infrastructure_error",
      summary: "Docker 预检失败，尚未开始功能验收。",
      evidence: [],
      errors: docker.errors ?? ["Docker 不可用。"],
      blocking_security_issue: false
    }], { docker });
  }
  updateStage(job, "docker", "passed", "Docker 可用。");

  job.current_stage = "install";
  updateStage(job, "install", "running", "正在通过现有 AgentProof Runner 安装依赖。");
  updateStage(job, "build", "running", "等待构建命令结果。");
  updateStage(job, "test", "running", "等待测试命令结果。");
  const childEnv = { AGENTPROOF_DATA_DIR: job.paths.data_root };
  const runner = await commandRunner(agentproofRoot, ["bin/agentproof.mjs", "run", "--profile", job.project.runner_profile.path, "--repo-root", job.project.git_root, "--commands", "--json"], childEnv);
  const runnerResult = parseJsonOutput(runner.stdout);
  recordRunnerStages(job, runner, runnerResult);
  if (runner.exitCode !== 0 || runnerResult.status !== "passed") {
    return finishJob(job, runnerResult.status === "infrastructure_error" ? "infrastructure_error" : "failed", [{
      criterion_id: "web-runner-install-build-test",
      status: runnerResult.status === "infrastructure_error" ? "infrastructure_error" : "failed",
      summary: "Runner 的安装、构建或测试阶段未成功完成。",
      evidence: [],
      errors: runnerResult.errors?.length ? runnerResult.errors : [runner.stderr || "Runner 执行失败。"],
      blocking_security_issue: false
    }], { runner: safeRunnerResult(runnerResult, job) });
  }

  if (!isOfficialDemoProject(job.project, agentproofRoot)) {
    updateStage(job, "start", "unverifiable", "该项目尚未配置专属启动与行为验收流程。");
    updateStage(job, "browser", "unverifiable", "当前项目未配置专属浏览器和联合断言流程。");
    updateStage(job, "api", "unverifiable", "当前项目未配置专属 API 断言流程。");
    updateStage(job, "database", "unverifiable", "当前项目未配置专属数据库断言流程。");
    return finishJob(job, "unverifiable", resultsForCriteria(job.criteria, []), { runner: safeRunnerResult(runnerResult, job) });
  }

  job.current_stage = "start";
  updateStage(job, "start", "running", "正在启动目标服务并准备浏览器验证。");
  updateStage(job, "browser", "running", "正在执行 M3 浏览器流程。");
  updateStage(job, "api", "running", "等待同一登录会话的 API 证据。");
  updateStage(job, "database", "running", "等待 SQLite 持久化证据。");
  const browser = await commandRunner(agentproofRoot, ["scripts/run-m3-browser-smoke.mjs", "--repo-root", agentproofRoot, "--demo-root", job.project.local_path], childEnv);
  job.logs.push({
    phase: "browser",
    exit_code: browser.exitCode,
    duration_ms: browser.durationMs,
    stdout: clip(redactLocal(browser.stdout, job)),
    stderr: clip(redactLocal(browser.stderr, job))
  });
  if (browser.exitCode !== 0) {
    updateStage(job, "start", "failed", "启动目标服务或浏览器流程失败。");
    updateStage(job, "browser", "failed", shortError("浏览器流程失败。", browser.stderr || browser.stdout));
    updateStage(job, "api", "unverifiable", "浏览器流程失败，API 证据未被接受。");
    updateStage(job, "database", "unverifiable", "浏览器流程失败，数据库证据未被接受。");
    return finishJob(job, "failed", [{
      criterion_id: "web-browser-api-database",
      status: "failed",
      summary: "M3 浏览器、API 或数据库验证失败。",
      evidence: [],
      errors: [browser.stderr || browser.stdout || "浏览器验证失败。"],
      blocking_security_issue: false
    }]);
  }

  const browserOutput = parseJsonOutput(browser.stdout);
  const browserSummaryPath = path.resolve(browserOutput.summary_path ?? "");
  if (!browserSummaryPath || !isInside(job.paths.data_root, browserSummaryPath)) throw new Error("浏览器验证摘要路径不在 AgentProof 数据目录内。");
  const browserSummary = JSON.parse(fs.readFileSync(browserSummaryPath, "utf8"));
  updateStage(job, "start", "passed", "目标服务已启动并完成验证流程。", { duration_ms: browser.durationMs });
  updateStage(job, "browser", browserSummary.status === "passed" ? "passed" : "failed", "浏览器流程已完成。", { duration_ms: browser.durationMs });
  updateStage(job, "api", browserSummary.report.status_counts.failed === 0 ? "passed" : "failed", "已采集并验证 API 观察结果。");
  updateStage(job, "database", browserSummary.report.status_counts.failed === 0 ? "passed" : "failed", "已采集并验证 SQLite 观察结果。");
  copyEvidence(job, browserSummary);

  const results = resultsForCriteria(job.criteria, browserSummary.report.results);
  return finishJob(job, browserSummary.status, results, { runner: safeRunnerResult(runnerResult, job), browser: browserSummary });
}

function finishJob(job, status, results, extra = {}) {
  job.current_stage = "report";
  updateStage(job, "report", "running", "正在生成 HTML 和 Markdown 报告。");
  const report = createVerificationReport({ run_id: job.run_id, results });
  const artifactDir = job.paths.run_dir;
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, "report.html"), renderHtmlReport(report), "utf8");
  fs.writeFileSync(path.join(artifactDir, "report.md"), renderMarkdownReport(report), "utf8");
  fs.writeFileSync(path.join(artifactDir, "summary.json"), `${JSON.stringify({ run_id: job.run_id, status, requirement: job.requirement, criteria: job.criteria, report, evidence: job.evidence, extra: sanitizeForBrowser(extra, job) }, null, 2)}\n`, "utf8");
  job.status = terminalStatus(report, status);
  job.report = report;
  job.artifact_dir = artifactDir;
  job.report_urls = {
    html: `/api/runs/${job.run_id}/report.html`,
    markdown: `/api/runs/${job.run_id}/report.md`
  };
  updateStage(job, "report", "passed", "报告已生成。");
  job.current_stage = "complete";
  job.completed_at = new Date().toISOString();
}

function resultsForCriteria(criteria, actualResults) {
  const byId = new Map(actualResults.map(result => [result.criterion_id, result]));
  return criteria.map((criterion, index) => {
    if (criterion.status === "insufficient_spec") {
      return {
        criterion_id: criterion.criterion_id || `manual-${index + 1}`,
        status: "insufficient_spec",
        summary: `${criterion.title}：需求需要补充更多细节后才能自动验证。`,
        evidence: [],
        errors: ["用户标记为需求描述不足。"],
        blocking_security_issue: false
      };
    }
    return byId.get(criterion.criterion_id) ?? {
      criterion_id: criterion.criterion_id || `manual-${index + 1}`,
      status: "unverifiable",
      summary: `${criterion.title}：该手动验收项尚未映射到自动化 M3 断言。`,
      evidence: [],
      errors: ["没有可用于该验收项的浏览器、API 或数据库自动化断言。"],
      blocking_security_issue: false
    };
  });
}

function copyEvidence(job, browserSummary) {
  const sourceDir = path.resolve(browserSummary.output_dir ?? "");
  if (!sourceDir || !isInside(job.paths.data_root, sourceDir)) throw new Error("浏览器证据目录不在 AgentProof 数据目录内。");
  const targetDir = job.paths.evidence_dir;
  fs.mkdirSync(targetDir, { recursive: true });
  const files = [
    ["browser-events.json", "application/json; charset=utf-8"],
    ["final-screen.png", "image/png"],
    ["joined-observation.json", "application/json; charset=utf-8"],
    ["manifest.json", "application/json; charset=utf-8"],
    ["summary.json", "application/json; charset=utf-8"],
    ["report.md", "text/markdown; charset=utf-8"]
  ];
  job.evidence = files.filter(([file]) => fs.existsSync(path.join(sourceDir, file))).map(([file, contentType]) => {
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
    return { file, content_type: contentType, url: `/api/runs/${job.run_id}/evidence/${file}` };
  });
}

function inspectProject(inputPath, { agentproofRoot, officialDemoRoot }) {
  const isDesktopDemo = inputPath === OFFICIAL_DEMO_TOKEN && officialDemoRoot;
  const projectPath = isDesktopDemo ? officialDemoRoot : resolveDirectory(inputPath);
  let gitRoot = projectPath;
  let branch = isDesktopDemo ? "desktop-demo" : "unknown";
  let commit = desktopDemoCommit(projectPath);
  let statusLines = [];
  if (!isDesktopDemo) {
    gitRoot = git(projectPath, ["rev-parse", "--show-toplevel"]).trim();
    branch = git(projectPath, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    commit = git(projectPath, ["rev-parse", "HEAD"]).trim();
    statusLines = git(projectPath, ["status", "--short"]).split(/\r?\n/).filter(Boolean);
  }
  const profilePath = path.join(projectPath, "agentproof.runner-profile.json");
  const profile = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, "utf8")) : null;
  const validation = profile ? validateRunnerProfile(profile, { repoRoot: gitRoot }) : null;
  return {
    name: path.basename(projectPath),
    local_path: projectPath,
    request_path: isDesktopDemo ? OFFICIAL_DEMO_TOKEN : projectPath,
    path_display: isDesktopDemo ? "官方 Demo（用户数据目录）" : displayPath(projectPath, agentproofRoot),
    is_official_demo: isDesktopDemo || isOfficialDemoPath(projectPath, agentproofRoot),
    git_root: gitRoot,
    branch,
    commit,
    short_commit: commit.slice(0, 7),
    workspace_status: statusLines.length ? "dirty" : "clean",
    workspace_changes: statusLines.slice(0, 20),
    runner_profile: profile ? {
      path: profilePath,
      valid: validation.valid,
      errors: validation.errors,
      commands: profile.commands,
      port: profile.port,
      healthcheck: profile.healthcheck,
      package_manager: profile.package_manager,
      image: profile.image
    } : null
  };
}

function isOfficialDemoProject(project, agentproofRoot) {
  if (project.is_official_demo) return true;
  const demoProfile = path.join(agentproofRoot, "samples", "demo-web-app", "agentproof.runner-profile.json");
  return path.resolve(project.git_root) === path.resolve(agentproofRoot) && path.resolve(project.runner_profile?.path ?? "") === path.resolve(demoProfile);
}

function recordRunnerStages(job, runner, runnerResult) {
  const commandByPhase = new Map((runnerResult.commands ?? []).filter(command => command.phase).map(command => [command.phase, command]));
  for (const phase of ["install", "build", "test"]) {
    const command = commandByPhase.get(phase);
    if (!command) {
      updateStage(job, phase, runnerResult.status === "passed" ? "passed" : "unverifiable", "未找到该阶段的命令记录。");
    } else {
      updateStage(job, phase, command.exitCode === 0 ? "passed" : "failed", commandSummary(phase, command), { duration_ms: command.durationMs });
      job.logs.push({
        phase,
        exit_code: command.exitCode,
        duration_ms: command.durationMs,
        stdout: clip(redactLocal(command.stdout, job)),
        stderr: clip(redactLocal(command.stderr, job))
      });
    }
  }
  if (runner.stderr) job.logs.push({ phase: "runner", exit_code: runner.exitCode, stdout: "", stderr: clip(redactLocal(runner.stderr, job)) });
}

function safeRunnerResult(result, job) {
  return {
    status: result.status,
    runId: result.runId,
    cleanup: result.cleanup,
    errors: result.errors,
    commands: (result.commands ?? []).map(command => ({
      phase: command.phase,
      exitCode: command.exitCode,
      durationMs: command.durationMs,
      timedOut: command.timedOut,
      cancelled: command.cancelled,
      stdout: clip(redactLocal(command.stdout, job)),
      stderr: clip(redactLocal(command.stderr, job))
    }))
  };
}

function terminalStatus(report, fallback) {
  if (report.merge_recommendation === "recommend_merge") return "passed";
  if (report.status_counts.infrastructure_error > 0) return "infrastructure_error";
  if (report.status_counts.failed > 0) return "failed";
  if (report.status_counts.insufficient_spec > 0) return "indeterminate";
  if (report.status_counts.unstable > 0) return "unstable";
  if (report.status_counts.unverifiable > 0) return "unverifiable";
  return fallback;
}

function publicJob(job) {
  return {
    run_id: job.run_id,
    status: job.status,
    current_stage: job.current_stage,
    project: {
      name: job.project.name,
      path_display: job.project.path_display,
      request_path: job.project.request_path,
      is_official_demo: job.project.is_official_demo,
      branch: job.project.branch,
      short_commit: job.project.short_commit,
      workspace_status: job.project.workspace_status,
      workspace_changes: job.project.workspace_changes,
      runner_profile: job.project.runner_profile ? {
        valid: job.project.runner_profile.valid,
        errors: job.project.runner_profile.errors,
        commands: job.project.runner_profile.commands,
        port: job.project.runner_profile.port,
        healthcheck: job.project.runner_profile.healthcheck,
        package_manager: job.project.runner_profile.package_manager,
        image: job.project.runner_profile.image
      } : null
    },
    requirement: job.requirement,
    criteria: job.criteria,
    stages: job.stages,
    logs: job.logs,
    evidence: job.evidence,
    report: job.report,
    report_urls: job.report_urls,
    created_at: job.created_at,
    completed_at: job.completed_at
  };
}

function normalizeCriteria(value) {
  const items = Array.isArray(value) ? value : [];
  return items.map((item, index) => ({
    criterion_id: safeId(item.criterion_id || `manual-${index + 1}`),
    title: String(item.title ?? `验收项 ${index + 1}`).trim() || `验收项 ${index + 1}`,
    description: String(item.description ?? "").trim() || "未提供描述。",
    severity: ["informational", "low", "medium", "high", "blocking"].includes(item.severity) ? item.severity : "medium",
    status: item.status === "insufficient_spec" ? "insufficient_spec" : "user_confirmed"
  }));
}

function stage(id, status, message, extra = {}) {
  return { id, status, message, updated_at: new Date().toISOString(), ...extra };
}

function updateStage(job, id, status, message, extra = {}) {
  const item = job.stages.find(entry => entry.id === id);
  if (!item) return;
  const now = new Date();
  const patch = { status, message, updated_at: now.toISOString(), ...extra };
  if (status === "running" && !item.started_at) patch.started_at = patch.updated_at;
  if (isTerminalStatus(status) && item.started_at && patch.duration_ms === undefined) {
    patch.duration_ms = Math.max(0, now.getTime() - Date.parse(item.started_at));
  }
  Object.assign(item, patch);
}

function runNode(cwd, args, extraEnv = {}) {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(process.execPath, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...extraEnv } });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => resolve({ exitCode: 1, durationMs: Date.now() - started, stdout, stderr: `${stderr}\n${error.message}`.trim() }));
    child.on("exit", code => resolve({ exitCode: code ?? 1, durationMs: Date.now() - started, stdout, stderr }));
  });
}

function parseJsonOutput(stdout) {
  const start = stdout.lastIndexOf("{");
  if (start < 0) throw new Error("Expected JSON output from AgentProof CLI.");
  for (let index = 0; index < stdout.length; index += 1) {
    const candidate = stdout.slice(index).trim();
    if (!candidate.startsWith("{")) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // keep looking; CLI may print progress before JSON
    }
  }
  throw new Error("Could not parse AgentProof CLI JSON output.");
}

function resolveDirectory(inputPath) {
  const raw = String(inputPath ?? "").trim();
  if (!raw) throw new Error("请填写本地 Git 仓库路径。");
  const absolute = path.resolve(raw);
  if (!fs.existsSync(absolute)) throw userError("项目路径不存在。");
  if (!fs.statSync(absolute).isDirectory()) throw userError("项目路径必须是文件夹。");
  return absolute;
}

function isOfficialDemoPath(projectPath, agentproofRoot) {
  return path.resolve(projectPath) === path.resolve(agentproofRoot, "samples", "demo-web-app");
}

function desktopDemoCommit(projectPath) {
  const marker = path.join(projectPath, ".agentproof-demo-version");
  if (fs.existsSync(marker)) return `desktop-demo-${fs.readFileSync(marker, "utf8").trim()}`;
  return "desktop-demo";
}

function userError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function git(cwd, args) {
  const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || "Git 命令失败。");
  return result.stdout;
}

function serveStatic(response, pathname) {
  const target = pathname === "/" ? path.join(STATIC_DIR, "index.html") : path.join(STATIC_DIR, pathname.replace(/^\/+/, ""));
  if (!isInside(STATIC_DIR, target) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return respondJson(response, 404, { error: "未找到请求的资源。" });
  const ext = path.extname(target);
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
  response.writeHead(200, {
    "content-type": types[ext] ?? "application/octet-stream",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' blob: data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff"
  });
  fs.createReadStream(target).pipe(response);
}

function respondJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function protectedRoute(pathname) {
  return pathname.startsWith("/api/");
}

function authorized(request, token) {
  return request.headers["x-agentproof-session"] === token;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) reject(new Error("请求内容过大。"));
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("请求内容必须是 JSON。"));
      }
    });
    request.on("error", reject);
  });
}

function sanitizeForBrowser(value, job) {
  if (typeof value === "string") return redactLocal(value, job);
  if (Array.isArray(value)) return value.map(item => sanitizeForBrowser(item, job));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeForBrowser(item, job)]));
  return value;
}

function redactLocal(value, job) {
  let text = String(value ?? "");
  for (const replacement of [
    [job.project.git_root, "[GIT_ROOT]"],
    [path.dirname(job.project.runner_profile.path), "[PROJECT]"],
    [job.paths?.data_root, "[AGENTPROOF_DATA]"],
    [process.env.USERPROFILE, "[HOME]"]
  ]) {
    if (replacement[0]) text = text.replaceAll(replacement[0], replacement[1]);
  }
  return text;
}

function displayPath(value, root) {
  return isInside(root, value) ? path.relative(root, value) || "." : path.basename(value);
}

function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function runIdFrom(pathname) {
  return pathname.split("/")[3];
}

function safeId(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "") || `criterion-${Date.now().toString(36)}`;
}

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clip(value, max = 4000) {
  const text = String(value ?? "");
  return text.length <= max ? text : `${text.slice(0, max)}\n...[truncated]`;
}

function commandSummary(phase, command) {
  const label = { install: "安装依赖", build: "构建项目", test: "运行测试" }[phase] ?? phase;
  const base = command.exitCode === 0 ? `${label}完成，退出码 ${command.exitCode}。` : `${label}失败，退出码 ${command.exitCode}。`;
  return command.exitCode === 0 ? base : shortError(base, command.stderr || command.stdout);
}

function shortError(prefix, output) {
  const firstLine = String(output ?? "").split(/\r?\n/).map(line => line.trim()).find(Boolean);
  return firstLine ? `${prefix}错误摘要：${firstLine}` : prefix;
}

function isTerminalStatus(status) {
  return ["passed", "failed", "infrastructure_error", "insufficient_spec", "unverifiable", "unstable", "indeterminate"].includes(status);
}
