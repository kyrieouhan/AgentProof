import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { browserWindowOptions, isAllowedNavigation, isExternalHttpUrl } from "../desktop/config.mjs";
import { prepareOfficialDemo } from "../desktop/demo-assets.mjs";
import { nodeEnv, resolveBundledNode } from "../desktop/process-launcher.mjs";

test("Electron browser window uses the required security flags", () => {
  const options = browserWindowOptions({ preload: "preload.mjs" });
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.webSecurity, true);
  assert.equal(options.webPreferences.enableRemoteModule, false);
});

test("desktop navigation is limited to the local app and generated blob reports", () => {
  const origin = "http://127.0.0.1:43210";
  assert.equal(isAllowedNavigation(`${origin}/api/runs/1/report.html`, origin), true);
  assert.equal(isAllowedNavigation("about:blank", origin), true);
  assert.equal(isAllowedNavigation("blob:http://127.0.0.1:43210/report", origin), true);
  assert.equal(isAllowedNavigation("https://example.com", origin), false);
  assert.equal(isExternalHttpUrl("https://example.com/docs", origin), true);
  assert.equal(isExternalHttpUrl(`${origin}/styles.css`, origin), false);
});

test("desktop child process environment runs Electron as Node without using shell strings", () => {
  const env = nodeEnv({ PATH: "base" }, { AGENTPROOF_DATA_DIR: "D:\\AgentProofData" });
  assert.equal(env.ELECTRON_RUN_AS_NODE, "1");
  assert.equal(env.PATH, "base");
  assert.equal(env.AGENTPROOF_DATA_DIR, "D:\\AgentProofData");
});

test("desktop child process launcher can use a bundled Node runtime", () => {
  const appRoot = tempDir("agentproof-app-root");
  const nodeExe = path.join(appRoot, "node_modules", "node", "bin", "node.exe");
  fs.mkdirSync(path.dirname(nodeExe), { recursive: true });
  fs.writeFileSync(nodeExe, "");

  assert.equal(resolveBundledNode(appRoot, "fallback.exe"), nodeExe);
  const env = nodeEnv({ ELECTRON_RUN_AS_NODE: "1", PATH: "base" }, {}, { electronRunAsNode: false });
  assert.equal("ELECTRON_RUN_AS_NODE" in env, false);
});

test("official demo is copied to user data, versioned, and not overwritten", () => {
  const appRoot = tempDir("agentproof-app-root");
  const dataRoot = tempDir("agentproof-data-root");
  const source = path.join(appRoot, "samples", "demo-web-app");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, "package.json"), "{}\n", "utf8");
  fs.writeFileSync(path.join(source, "agentproof.runner-profile.json"), `${JSON.stringify({
    repo_path: "samples/demo-web-app",
    commit: "HEAD"
  }, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.join(source, "dist"), { recursive: true });
  fs.writeFileSync(path.join(source, "dist", "ignored.txt"), "build output\n", "utf8");
  fs.mkdirSync(path.join(source, "node_modules", ".pnpm", "bindings@1.5.0", "node_modules", "bindings"), { recursive: true });
  fs.writeFileSync(path.join(source, "node_modules", ".pnpm", "bindings@1.5.0", "node_modules", "bindings", "package.json"), "{}\n", "utf8");
  fs.mkdirSync(path.join(source, "node_modules", ".pnpm", "tsx@4.23.0", "node_modules", "tsx", "dist"), { recursive: true });
  fs.writeFileSync(path.join(source, "node_modules", ".pnpm", "tsx@4.23.0", "node_modules", "tsx", "dist", "cli.mjs"), "\n", "utf8");
  fs.mkdirSync(path.join(source, "node_modules", ".pnpm", "@prisma+client@7.8.0", "node_modules", ".prisma", "client"), { recursive: true });
  fs.writeFileSync(path.join(source, "node_modules", ".pnpm", "@prisma+client@7.8.0", "node_modules", ".prisma", "client", "default.js"), "\n", "utf8");

  const first = prepareOfficialDemo({ appRoot, dataRoot, version: "0.1.0" });
  assert.equal(first, path.join(dataRoot, "demo", "0.1.0"));
  const copiedProfile = JSON.parse(fs.readFileSync(path.join(first, "agentproof.runner-profile.json"), "utf8"));
  assert.equal(copiedProfile.repo_path, ".");
  assert.equal(copiedProfile.commit, "desktop-demo");
  assert.equal(fs.existsSync(path.join(first, "node_modules", "bindings", "package.json")), true);
  assert.equal(fs.existsSync(path.join(first, "node_modules", "tsx", "dist", "cli.mjs")), true);
  assert.equal(fs.existsSync(path.join(first, "node_modules", ".prisma", "client", "default.js")), true);
  assert.equal(fs.existsSync(path.join(first, "dist", "ignored.txt")), false);

  fs.writeFileSync(path.join(first, "user-note.txt"), "keep me\n", "utf8");
  const second = prepareOfficialDemo({ appRoot, dataRoot, version: "0.1.0" });
  assert.equal(second, first);
  assert.equal(fs.existsSync(path.join(first, "user-note.txt")), true);
});

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}
