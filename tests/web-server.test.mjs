import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { startWebServer } from "../src/web/server.mjs";

test("web server reports invalid paths and Docker infrastructure errors", async () => {
  const app = await startWebServer({ port: 0, repoRoot: process.cwd(), dockerCommand: "__agentproof_missing_docker__" });
  try {
    const example = await get(`${app.url}/api/example`);
    assert.equal(example.status, 200);
    assert.match(example.body.example.requirement, /官方 Demo/);
    assert.equal(example.body.example.criteria.length, 2);

    const invalid = await post(`${app.url}/api/project`, { path: path.join(process.cwd(), "definitely-not-agentproof") });
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
  } finally {
    await close(app.server);
  }
});

async function get(url) {
  const response = await fetch(url);
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
