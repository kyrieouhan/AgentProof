import assert from "node:assert/strict";
import test from "node:test";
import { createVerificationReport, renderHtmlReport, renderMarkdownReport } from "../src/domain/report.mjs";

test("aggregates status counts and merge recommendation without scores", () => {
  const report = createVerificationReport({
    run_id: "vr-1",
    results: [
      result("ac-1", "passed"),
      result("ac-2", "unverifiable"),
      result("ac-3", "passed")
    ]
  });

  assert.equal(report.status_counts.passed, 2);
  assert.equal(report.status_counts.unverifiable, 1);
  assert.equal(report.merge_recommendation, "human_review");
  assert.equal(Object.hasOwn(report, "score"), false);
});

test("failed or blocking results override passing results", () => {
  assert.equal(createVerificationReport({ run_id: "vr-1", results: [result("ac-1", "failed")] }).merge_recommendation, "do_not_merge");
  assert.equal(createVerificationReport({ run_id: "vr-2", results: [{ ...result("ac-1", "passed"), blocking_security_issue: true }] }).merge_recommendation, "do_not_merge");
  assert.equal(createVerificationReport({ run_id: "vr-3", results: [result("ac-1", "infrastructure_error")] }).merge_recommendation, "indeterminate");
});

test("renders Markdown and escaped HTML reports", () => {
  const report = createVerificationReport({
    run_id: "vr-<script>",
    results: [
      {
        ...result("ac|1", "failed"),
        summary: "<script>alert(1)</script>",
        errors: ["bad | value"]
      }
    ]
  });

  const markdown = renderMarkdownReport(report);
  const html = renderHtmlReport(report);

  assert.match(markdown, /VeriCrate 验收报告/);
  assert.match(markdown, /失败 \(failed\)/);
  assert.match(markdown, /ac\\\|1/);
  assert.match(markdown, /bad \\\| value/);
  assert.match(html, /lang="zh-CN"/);
  assert.match(html, /VeriCrate 验收报告/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

function result(criterion_id, status) {
  return {
    criterion_id,
    status,
    summary: `${criterion_id} ${status}`,
    evidence: [],
    errors: [],
    blocking_security_issue: false
  };
}
