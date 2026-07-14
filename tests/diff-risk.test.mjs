import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDiffRisk } from "../src/domain/diff-risk.mjs";
import { domainJsonSchemas } from "../src/domain/schemas.mjs";

test("diff risk model flags skipped tests without assigning blame", () => {
  const report = analyzeDiffRisk(`diff --git a/tests/app.test.ts b/tests/app.test.ts
--- a/tests/app.test.ts
+++ b/tests/app.test.ts
@@ -60 +60 @@
-  it("does not let case or whitespace bypass email uniqueness", async () => {
+  it.skip("does not let case or whitespace bypass email uniqueness", async () => {
`, { source: "unit-test" });

  assert.equal(report.recommendation, "human_review");
  assert.equal(report.risks[0].category, "weakened_tests");
  assert.equal(report.risks[0].severity, "high");
  assert.match(report.risks[0].summary, /skipped/);
});

test("diff risk model ignores ordinary implementation changes", () => {
  const report = analyzeDiffRisk(`diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1 @@
-const title = "old";
+const title = "new";
`);

  assert.equal(report.risk_count, 0);
  assert.equal(report.recommendation, "no_diff_risk_detected");
});

test("diff risk report schema is generated", () => {
  assert.equal(domainJsonSchemas()["diff-risk-report.schema.json"].properties.risks.type, "array");
});
