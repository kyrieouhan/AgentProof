import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { redactBrowserEvents, sanitizeUrl, startBrowserEvidenceRecorder } from "../src/domain/browser-evidence.mjs";

test("browser evidence redacts emails and secret-looking pairs", () => {
  const redacted = redactBrowserEvents({
    console: [{ text: "registered demo@example.test token=abc123" }],
    failed_responses: [{ url: "http://demo.local/api?password=hunter2" }]
  });

  assert.equal(redacted.value.console[0].text, "registered [REDACTED_EMAIL] token=[REDACTED]");
  assert.equal(redacted.value.failed_responses[0].url, "http://demo.local/api?password=[REDACTED]");
  assert.deepEqual(redacted.summary.redacted_paths, ["console.0.text", "failed_responses.0.url"]);
});

test("browser evidence recorder captures console, page errors, and failed network", () => {
  const page = new EventEmitter();
  page.off = page.removeListener.bind(page);
  const recorder = startBrowserEvidenceRecorder(page);
  page.emit("console", { type: () => "error", text: () => "bad user@example.test" });
  page.emit("pageerror", new Error("boom"));
  page.emit("requestfailed", {
    method: () => "GET",
    url: () => "http://demo.local/api/tasks?token=secret",
    failure: () => ({ errorText: "blocked" })
  });
  page.emit("response", {
    status: () => 403,
    url: () => "http://demo.local/api/admin/summary?token=secret",
    request: () => ({ method: () => "GET" })
  });
  const evidence = recorder.stop();

  assert.equal(evidence.value.console[0].text, "bad [REDACTED_EMAIL]");
  assert.equal(evidence.value.page_errors[0].message, "boom");
  assert.equal(evidence.value.failed_requests[0].url, "http://demo.local/api/tasks");
  assert.equal(evidence.value.failed_responses[0].status, 403);
});

test("sanitizeUrl drops query strings before storing browser evidence", () => {
  assert.equal(sanitizeUrl("http://demo.local/path?token=secret#frag"), "http://demo.local/path");
});
