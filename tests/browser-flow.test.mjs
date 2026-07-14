import assert from "node:assert/strict";
import test from "node:test";
import { BrowserFlowSchema, DOMAIN_SCHEMA_VERSION, domainJsonSchemas } from "../src/domain/schemas.mjs";
import { runBrowserFlow } from "../src/domain/browser-flow.mjs";

test("browser flow schema accepts minimal official demo steps", () => {
  const flow = BrowserFlowSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    flow_id: "demo-register-flow",
    title: "Register and save a task",
    steps: [
      { action: "goto", path: "/" },
      { action: "fill", target: { strategy: "css", selector: "#register-form input[name=email]" }, value: "demo@example.test" },
      { action: "click", target: { strategy: "role", role: "button", name: "Create account" } },
      { action: "expect_text", target: { strategy: "css", selector: "#status" }, text: "Registration succeeded" }
    ]
  });

  assert.equal(flow.timeout_ms, 5000);
  assert.equal(domainJsonSchemas()["browser-flow.schema.json"].properties.flow_id.type, "string");
});

test("browser flow runner executes steps in order", async () => {
  const page = fakePage({
    "css:#status": "Registration succeeded and you are logged in.",
    "role:button:Create account": ""
  });
  const result = await runBrowserFlow({
    schema_version: DOMAIN_SCHEMA_VERSION,
    flow_id: "demo-register-flow",
    title: "Register and save a task",
    steps: [
      { action: "goto", path: "/" },
      { action: "fill", target: { strategy: "css", selector: "#register-form input[name=email]" }, value: "demo@example.test" },
      { action: "click", target: { strategy: "role", role: "button", name: "Create account" } },
      { action: "expect_text", target: { strategy: "css", selector: "#status" }, text: "Registration succeeded" }
    ]
  }, { page, baseUrl: "http://demo.local" });

  assert.equal(result.status, "passed");
  assert.deepEqual(page.actions, [
    ["goto", "http://demo.local/"],
    ["fill", "css:#register-form input[name=email]", "demo@example.test"],
    ["click", "role:button:Create account"]
  ]);
});

test("browser flow runner reports the first failing step", async () => {
  const page = fakePage({ "css:#status": "Ready." });
  const result = await runBrowserFlow({
    schema_version: DOMAIN_SCHEMA_VERSION,
    flow_id: "demo-register-flow",
    title: "Register and save a task",
    timeout_ms: 1,
    steps: [
      { action: "goto", path: "/" },
      { action: "expect_text", target: { strategy: "css", selector: "#status" }, text: "Registration succeeded" }
    ]
  }, { page, baseUrl: "http://demo.local" });

  assert.equal(result.status, "failed");
  assert.match(result.errors[0], /step 2 expect_text/);
});

function fakePage(textByKey) {
  const page = {
    actions: [],
    currentUrl: "http://demo.local/",
    async goto(url) {
      this.currentUrl = url;
      this.actions.push(["goto", url]);
    },
    url() {
      return this.currentUrl;
    },
    locator(selector) {
      return fakeLocator(page, `css:${selector}`, textByKey[`css:${selector}`] ?? "");
    },
    getByRole(role, options) {
      const key = `role:${role}:${options.name}`;
      return fakeLocator(page, key, textByKey[key] ?? "");
    }
  };
  return page;
}

function fakeLocator(page, key, text) {
  return {
    async fill(value) {
      page.actions.push(["fill", key, value]);
    },
    async click() {
      page.actions.push(["click", key]);
    },
    async textContent() {
      return text;
    }
  };
}
