#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { startWebServer } from "../src/web/server.mjs";
import { createSmokeRunPaths } from "../src/runtime-paths.mjs";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const runId = `m3-web-${Date.now().toString(36)}`;
const paths = createSmokeRunPaths("m3-web-smoke", runId);
const artifactDir = paths.run_dir;

const host = "127.0.0.1";
const port = await freePort();
const initialGitStatus = gitStatus(repoRoot);
const app = await startWebServer({ host, port, repoRoot, dataDir: paths.data_root });
const browser = await chromium.launch({ executablePath: findBrowserExecutable(), headless: true });
const results = [];

try {
  await assertHealth(app.url);
  const page = await browser.newPage();
  await page.goto(app.url);
  await page.getByTestId("project-path").fill(path.join(repoRoot, "missing-project"));
  await page.getByTestId("inspect-project").click();
  await page.getByTestId("project-error").waitFor({ state: "visible" });
  const invalidPathMessage = await page.getByTestId("project-error").textContent();
  if (!/不存在/.test(invalidPathMessage ?? "")) throw new Error(`Unexpected invalid path message: ${invalidPathMessage}`);

  await assertEditingControls(page);

  for (let index = 0; index < 3; index += 1) {
    results.push(await runUiFlow(page, index + 1));
  }

  await page.close();
  const badDockerPort = await freePort();
  const badDocker = await startWebServer({ host, port: badDockerPort, repoRoot, dataDir: paths.data_root, dockerCommand: "__agentproof_missing_docker__" });
  try {
    const badPage = await browser.newPage();
    await badPage.goto(badDocker.url);
    await importDemoAndStart(badPage, "Docker 不可用路径测试");
    await waitForStatus(badPage, "infrastructure_error", 30000);
    const infraText = await badPage.getByTestId("run-status").textContent();
    if (infraText !== "基础设施错误") throw new Error(`Infrastructure status was not localized: ${infraText}`);
    await badPage.close();
  } finally {
    await close(badDocker.server);
  }

  const consistent = results.every(result => result.status === "passed" && result.recommendation === "recommend_merge");
  const finalGitStatus = gitStatus(repoRoot);
  if (finalGitStatus !== initialGitStatus) throw new Error(`Web smoke changed target git status.\nBefore:\n${initialGitStatus}\nAfter:\n${finalGitStatus}`);
  const summary = {
    run_id: runId,
    status: consistent ? "passed" : "failed",
    address: app.url,
    output_dir: artifactDir,
    summary_path: path.join(artifactDir, "summary.json"),
    repeat_count: results.length,
    consistent,
    runs: results,
    invalid_path_check: "passed",
    docker_unavailable_check: "passed"
  };
  fs.writeFileSync(path.join(artifactDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(artifactDir, "report.md"), renderReport(summary), "utf8");
  console.log(JSON.stringify({ status: summary.status, repeat_count: summary.repeat_count, consistent: summary.consistent, summary_path: summary.summary_path, output_dir: summary.output_dir }, null, 2));
  if (summary.status !== "passed") process.exitCode = 1;
} finally {
  await browser.close();
  await close(app.server);
}

async function runUiFlow(page, repeat) {
  await page.goto(app.url);
  await importDemoAndStart(page, `Web MVP 中文界面重复验收 ${repeat}`);
  await waitForStatus(page, "passed", 600000);
  const localizedStatus = await page.getByTestId("run-status").textContent();
  if (localizedStatus !== "通过") throw new Error(`Run status was not localized: ${localizedStatus}`);
  const recommendation = await page.getByTestId("merge-recommendation").getAttribute("data-recommendation");
  const recommendationText = await page.getByTestId("merge-recommendation").textContent();
  if (recommendation !== "recommend_merge") throw new Error(`Unexpected recommendation: ${recommendation}`);
  if (recommendationText !== "建议合并") throw new Error(`Recommendation was not localized: ${recommendationText}`);
  await assertLogToggle(page);
  const htmlHref = await page.locator('[data-testid="report-links"] a', { hasText: "查看 HTML 报告" }).getAttribute("href");
  const mdHref = await page.locator('[data-testid="report-links"] a', { hasText: "下载 Markdown 报告" }).getAttribute("href");
  const screenshotHref = await page.locator('[data-testid="report-links"] a', { hasText: "final-screen.png" }).getAttribute("href");
  const html = await fetchText(new URL(htmlHref, app.url));
  const markdown = await fetchText(new URL(mdHref, app.url));
  const screenshot = await fetch(new URL(screenshotHref, app.url));
  if (!html.includes("AgentProof 验收报告")) throw new Error("HTML report did not render.");
  if (!markdown.includes("合并建议：建议合并 (recommend_merge)")) throw new Error("Markdown report did not export.");
  if (!screenshot.ok || screenshot.headers.get("content-type") !== "image/png") throw new Error("Screenshot evidence did not open.");
  return { repeat, status: "passed", recommendation };
}

async function importDemoAndStart(page, requirement) {
  await page.getByTestId("project-path").fill(path.join(repoRoot, "samples", "demo-web-app"));
  await page.getByTestId("inspect-project").click();
  await page.getByTestId("project-summary").locator('[data-testid="project-name"]').waitFor();
  const summaryText = await page.getByTestId("project-summary").textContent();
  for (const expected of ["项目名称", "分支", "提交哈希", "工作区状态", "运行配置", "安装命令", "构建命令", "测试命令", "启动命令", "pnpm install --frozen-lockfile", "pnpm start"]) {
    if (!summaryText.includes(expected)) throw new Error(`Project summary missing localized or raw value: ${expected}`);
  }
  if ((await page.getByTestId("requirement").inputValue()) !== "") throw new Error("Demo requirement loaded before user requested it.");
  await page.getByTestId("criteria-empty").waitFor({ state: "visible" });
  await page.getByTestId("load-example").click();
  await page.getByTestId("criterion-title-0").waitFor({ state: "visible" });
  await page.getByTestId("requirement").fill(requirement);
  await page.getByTestId("criterion-title-0").fill("中文注册验收");
  await page.getByTestId("criterion-description-0").fill("注册、登录态、任务创建和管理员接口拒绝都应通过。");
  await page.getByTestId("start-run").click();
}

async function assertEditingControls(page) {
  await page.goto(app.url);
  if ((await page.getByTestId("requirement").inputValue()) !== "") throw new Error("Requirement should be empty on first load.");
  await page.getByTestId("criteria-empty").waitFor({ state: "visible" });

  await page.getByTestId("load-example").click();
  await page.getByTestId("criterion-title-0").waitFor({ state: "visible" });
  const loadedRequirement = await page.getByTestId("requirement").inputValue();
  if (!loadedRequirement.includes("验证官方 Demo")) throw new Error("Example requirement did not load.");
  if ((await page.locator('[data-testid="criterion-card"]').count()) !== 2) throw new Error("Example criteria did not load.");

  await page.getByTestId("requirement").fill("用户自己的需求");
  await page.getByTestId("criterion-title-0").fill("用户自己的验收项");
  await confirmAction(page, "load-example", "加载示例将覆盖当前填写的需求和验收项，是否继续？", false);
  if ((await page.getByTestId("requirement").inputValue()) !== "用户自己的需求") throw new Error("Dismissed example load changed requirement.");
  if ((await page.getByTestId("criterion-title-0").inputValue()) !== "用户自己的验收项") throw new Error("Dismissed example load changed criteria.");

  await confirmAction(page, "load-example", "加载示例将覆盖当前填写的需求和验收项，是否继续？", true);
  if (!(await page.getByTestId("requirement").inputValue()).includes("验证官方 Demo")) throw new Error("Accepted example load did not replace requirement.");

  await confirmAction(page, "clear-content", "确定清空当前需求和全部验收项吗？此操作无法撤销。", false);
  if ((await page.locator('[data-testid="criterion-card"]').count()) !== 2) throw new Error("Dismissed clear changed criteria.");

  await confirmAction(page, "clear-content", "确定清空当前需求和全部验收项吗？此操作无法撤销。", true);
  if ((await page.getByTestId("requirement").inputValue()) !== "") throw new Error("Accepted clear did not empty requirement.");
  await page.getByTestId("criteria-empty").waitFor({ state: "visible" });

  for (const title of ["第一项", "第二项", "第三项"]) {
    await page.getByRole("button", { name: "添加验收项" }).click();
    const index = (await page.locator('[data-testid="criterion-card"]').count()) - 1;
    await page.getByTestId(`criterion-title-${index}`).fill(title);
    await page.getByTestId(`criterion-description-${index}`).fill(`${title}的可验证描述`);
  }
  await page.getByTestId("criterion-status-2").selectOption("user_confirmed");
  await page.getByTestId("delete-criterion-1").click();
  if ((await page.locator('[data-testid="criterion-card"]').count()) !== 2) throw new Error("Deleting the middle criterion did not remove one item.");
  if ((await page.getByTestId("criterion-title-0").inputValue()) !== "第一项") throw new Error("First criterion shifted incorrectly after delete.");
  if ((await page.getByTestId("criterion-title-1").inputValue()) !== "第三项") throw new Error("Third criterion shifted incorrectly after middle delete.");
  if ((await page.getByTestId("criterion-status-1").inputValue()) !== "user_confirmed") throw new Error("Criterion status shifted incorrectly after middle delete.");

  await page.getByTestId("delete-criterion-1").click();
  await page.getByTestId("delete-criterion-0").click();
  await page.getByTestId("criteria-empty").waitFor({ state: "visible" });

  await page.getByRole("button", { name: "添加验收项" }).click();
  if ((await page.getByTestId("criterion-title-0").inputValue()) !== "") throw new Error("New criterion title should be empty.");
  if ((await page.getByTestId("criterion-title-0").getAttribute("placeholder")) !== "请输入验收项标题") throw new Error("Title placeholder is missing.");
  if ((await page.getByTestId("criterion-description-0").inputValue()) !== "") throw new Error("New criterion description should be empty.");
  if ((await page.getByTestId("criterion-description-0").getAttribute("placeholder")) !== "描述可观察、可验证的预期行为") throw new Error("Description placeholder is missing.");
  if ((await page.getByTestId("criterion-status-0").inputValue()) !== "insufficient_spec") throw new Error("New criterion should default to insufficient_spec.");
}

async function confirmAction(page, testId, expectedMessage, accept) {
  const dialogPromise = page.waitForEvent("dialog").then(async dialog => {
    if (dialog.message() !== expectedMessage) throw new Error(`Unexpected dialog message: ${dialog.message()}`);
    if (accept) await dialog.accept();
    else await dialog.dismiss();
  });
  await page.getByTestId(testId).click();
  await dialogPromise;
}

async function waitForStatus(page, expected, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const raw = await page.getByTestId("run-status").getAttribute("data-status").catch(() => "");
    if (raw === expected) return;
    await page.waitForTimeout(1000);
  }
  throw new Error(`Timed out waiting for ${expected}. Last status: ${await page.getByTestId("run-status").getAttribute("data-status").catch(() => "none")}`);
}

async function assertLogToggle(page) {
  const button = page.locator("[data-log-toggle]").first();
  await button.waitFor({ state: "visible" });
  const panelId = await button.getAttribute("data-log-toggle");
  const panel = page.locator(`[data-log-panel="${panelId}"]`);
  if (!(await panel.evaluate(node => node.hidden))) throw new Error("Full log should be collapsed by default.");
  await button.click();
  if (await panel.evaluate(node => node.hidden)) throw new Error("Full log did not expand.");
  const rawLog = await panel.textContent();
  if (!rawLog.includes("stdout:") || !rawLog.includes("stderr:")) throw new Error("Raw stdout/stderr log was not preserved.");
  await button.click();
  if (!(await panel.evaluate(node => node.hidden))) throw new Error("Full log did not collapse.");
}

async function assertHealth(baseUrl) {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();
  if (!response.ok || body.status !== "ok") throw new Error("Web health check failed.");
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${url}`);
  return response.text();
}

function renderReport(summary) {
  return `# AgentProof M3 Web Smoke Report

- Status: ${summary.status}
- Address: ${summary.address}
- Repeat count: ${summary.repeat_count}
- Consistent: ${summary.consistent}
- Invalid path check: ${summary.invalid_path_check}
- Docker unavailable check: ${summary.docker_unavailable_check}

## Runs

${summary.runs.map(run => `- repeat ${run.repeat}: ${run.status}, ${run.recommendation}`).join("\n")}
`;
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

function close(server) {
  return new Promise(resolve => server.close(resolve));
}

function gitStatus(cwd) {
  const result = spawnSync("git", ["-C", cwd, "status", "--short"], { encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git status failed");
  return result.stdout.trim();
}
