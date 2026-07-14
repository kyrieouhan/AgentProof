import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { startWebServer } from "../src/web/server.mjs";
import { defaultDataRoot } from "../src/runtime-paths.mjs";
import { browserWindowOptions, isAllowedNavigation, isExternalHttpUrl } from "./config.mjs";
import { prepareOfficialDemo } from "./demo-assets.mjs";
import { createDesktopLogger } from "./logger.mjs";
import { createProcessLauncher } from "./process-launcher.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = app.getAppPath();
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, "package.json"), "utf8"));
const smokeMode = process.argv.includes("--smoke");
let mainWindow;
let webApp;
let launcher;
let logger;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(startDesktop).catch(error => {
    console.error(error);
    app.exit(1);
  });
}

async function startDesktop() {
  const token = crypto.randomBytes(32).toString("base64url");
  const dataRoot = defaultDataRoot();
  for (const dir of ["runs", "logs", "temp", "demo", "config"]) fs.mkdirSync(path.join(dataRoot, dir), { recursive: true });
  logger = createDesktopLogger(path.join(dataRoot, "logs"), { token });
  logger.info("AgentProof desktop starting.", { version: packageJson.version });

  const officialDemoRoot = prepareOfficialDemo({ appRoot, dataRoot, version: packageJson.version, logger });
  launcher = createProcessLauncher({ logger });
  const port = await freePort();
  webApp = await startWebServer({
    host: "127.0.0.1",
    port,
    repoRoot: appRoot,
    dataDir: dataRoot,
    accessToken: token,
    officialDemoRoot,
    desktopMode: true,
    commandRunner: launcher.runNode
  });
  logger.info("AgentProof local web server started.", { url: webApp.url });

  await createMainWindow({ token, url: webApp.url });
  if (smokeMode) await runSmoke({ token, url: webApp.url, dataRoot, officialDemoRoot });
}

async function createMainWindow({ token, url }) {
  mainWindow = new BrowserWindow(browserWindowOptions({
    preload: path.join(__dirname, "preload.mjs"),
    show: !smokeMode
  }));
  const origin = new URL(url).origin;
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!isAllowedNavigation(targetUrl, origin)) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (isAllowedNavigation(targetUrl, origin)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: browserWindowOptions({ preload: path.join(__dirname, "preload.mjs") })
      };
    }
    if (isExternalHttpUrl(targetUrl, origin)) shell.openExternal(targetUrl);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  await loadLocalUrlWithRetry(mainWindow, `${url}/?token=${encodeURIComponent(token)}`);
}

ipcMain.handle("agentproof:select-project-directory", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择本地 Git 项目文件夹",
    properties: ["openDirectory"]
  });
  if (result.canceled) return null;
  return result.filePaths[0] ?? null;
});

app.on("before-quit", () => {
  launcher?.killAll();
  if (webApp?.server?.listening) webApp.server.close();
});

app.on("window-all-closed", () => {
  app.quit();
});

async function runSmoke({ token, url, dataRoot, officialDemoRoot }) {
  const checks = [];
  checks.push(["health", await fetchJson(`${url}/health`)]);
  checks.push(["api_without_token", await fetchStatus(`${url}/api/example`)]);
  checks.push(["api_with_token", await fetchJson(`${url}/api/example`, token)]);
  checks.push(["window_loaded", { ok: !mainWindow.webContents.isCrashed() }]);
  const summary = {
    status: checks.every(([, value]) => value.ok || value.status === 401) ? "passed" : "failed",
    url,
    data_root: dataRoot,
    official_demo_root: officialDemoRoot,
    checks,
    window_options: browserWindowOptions({ preload: "preload.mjs" }).webPreferences
  };
  console.log(JSON.stringify(summary, null, 2));
  app.quit();
}

async function loadLocalUrlWithRetry(window, targetUrl) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await window.loadURL(targetUrl);
      return;
    } catch (error) {
      lastError = error;
      logger?.error("Failed to load local web UI.", { attempt, error: error.message });
      await pause(500 * attempt);
    }
  }
  throw lastError;
}

async function fetchJson(url, token) {
  const response = await fetch(url, { headers: token ? { "x-agentproof-session": token } : {} });
  return { ok: response.ok, status: response.status, body: await response.json().catch(() => null) };
}

async function fetchStatus(url) {
  const response = await fetch(url);
  return { ok: response.ok, status: response.status };
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

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
