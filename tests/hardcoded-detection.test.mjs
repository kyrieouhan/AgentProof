import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHardcodedProbe } from "../src/domain/hardcoded-detection.mjs";
import { domainJsonSchemas } from "../src/domain/schemas.mjs";

test("hardcoded probe asks for review when fixed input passes and randomized equivalent fails", () => {
  const report = evaluateHardcodedProbe({
    source: "unit-test",
    control_run: { label: "fixed-demo-email", status: 201, expected_status: 201 },
    randomized_runs: [{ label: "random-email", status: 400, expected_status: 201 }]
  });

  assert.equal(report.recommendation, "human_review");
  assert.equal(report.risk_count, 1);
});

test("hardcoded probe stays quiet when randomized equivalents pass", () => {
  const report = evaluateHardcodedProbe({
    source: "unit-test",
    control_run: { label: "fixed-demo-email", status: 201, expected_status: 201 },
    randomized_runs: [{ label: "random-email", status: 201, expected_status: 201 }]
  });

  assert.equal(report.recommendation, "no_hardcoded_behavior_detected");
});

test("hardcoded probe report schema is generated", () => {
  assert.equal(domainJsonSchemas()["hardcoded-probe-report.schema.json"].properties.randomized_runs.type, "array");
});
