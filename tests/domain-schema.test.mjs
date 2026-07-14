import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  AcceptanceCriterionSchema,
  DOMAIN_SCHEMA_VERSION,
  VerificationReportSchema,
  VerificationRunSchema,
  domainJsonSchemas
} from "../src/domain/schemas.mjs";
import { MERGE_RECOMMENDATIONS, RESULT_STATUSES, recommendMerge, summarizeStatuses } from "../src/domain/status.mjs";

test("result statuses and merge recommendations match the glossary", () => {
  assert.deepEqual(RESULT_STATUSES, ["passed", "failed", "insufficient_spec", "infrastructure_error", "unverifiable", "unstable"]);
  assert.deepEqual(MERGE_RECOMMENDATIONS, ["recommend_merge", "do_not_merge", "human_review", "indeterminate"]);
});

test("acceptance criteria require user-confirmable API or database assertions", () => {
  const criterion = {
    schema_version: DOMAIN_SCHEMA_VERSION,
    criterion_id: "ac-register-success",
    title: "Register creates a logged-in user",
    description: "A valid registration request returns 201 and creates a persistent user record.",
    severity: "high",
    manual_confirmation_required: true,
    assertions: [
      { kind: "api", method: "POST", path: "/api/register", expected_status: 201, expected_json: { ok: true } },
      { kind: "database", check_id: "user-count-increased", description: "User count increases by one", expected: { delta: 1 } }
    ]
  };

  assert.equal(AcceptanceCriterionSchema.parse(criterion).criterion_id, "ac-register-success");
  assert.throws(() => AcceptanceCriterionSchema.parse({ ...criterion, manual_confirmation_required: false }), z.ZodError);
});

test("verification run and report schemas share the domain version and known statuses", () => {
  const run = VerificationRunSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    run_id: "vr-demo-001",
    commit: "abc123",
    runner_profile: "samples/demo-web-app/agentproof.runner-profile.json",
    image_digest: "sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5",
    seed: "seed-001",
    criteria: [
      {
        schema_version: DOMAIN_SCHEMA_VERSION,
        criterion_id: "ac-login",
        title: "Login succeeds",
        description: "A valid login returns success.",
        severity: "medium",
        manual_confirmation_required: true,
        assertions: [{ kind: "api", method: "POST", path: "/api/login", expected_status: 200 }]
      }
    ]
  });

  const results = [{ criterion_id: "ac-login", status: "passed", summary: "Login returned 200", evidence: [] }];
  const report = VerificationReportSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    run_id: run.run_id,
    results,
    status_counts: summarizeStatuses(results),
    merge_recommendation: recommendMerge(results)
  });

  assert.equal(report.merge_recommendation, "recommend_merge");
  assert.equal(report.status_counts.passed, 1);
  assert.deepEqual(Object.keys(report.status_counts), RESULT_STATUSES);
});

test("merge recommendation follows blocking and unknown-evidence rules", () => {
  assert.equal(recommendMerge([{ status: "failed" }]), "do_not_merge");
  assert.equal(recommendMerge([{ status: "passed", blocking_security_issue: true }]), "do_not_merge");
  assert.equal(recommendMerge([{ status: "infrastructure_error" }]), "indeterminate");
  assert.equal(recommendMerge([{ status: "unverifiable" }]), "human_review");
  assert.equal(recommendMerge([{ status: "passed" }]), "recommend_merge");
});

test("domain Zod schemas generate JSON Schema", () => {
  const schemas = domainJsonSchemas();
  assert.deepEqual(Object.keys(schemas).sort(), [
    "acceptance-criterion-version.schema.json",
    "acceptance-criterion.schema.json",
    "browser-flow.schema.json",
    "diff-risk-report.schema.json",
    "evidence-manifest.schema.json",
    "hardcoded-probe-report.schema.json",
    "joined-assertion.schema.json",
    "readonly-rule-report.schema.json",
    "test-data-seed.schema.json",
    "verification-report.schema.json",
    "verification-run.schema.json"
  ]);
  assert.equal(schemas["verification-report.schema.json"].properties.merge_recommendation.enum.includes("do_not_merge"), true);
});
