import * as z from "zod";
import { MERGE_RECOMMENDATIONS, RESULT_STATUSES } from "./status.mjs";

export const DOMAIN_SCHEMA_VERSION = "1.0.0-m3";

const NonEmptyString = z.string().trim().min(1);
const RelativePath = z.string().min(1).refine(value => !value.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(value) && !value.split(/[\\/]+/).includes(".."), "must be a relative path inside the evidence directory");
const Sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const ResultStatusSchema = z.enum(RESULT_STATUSES);
export const MergeRecommendationSchema = z.enum(MERGE_RECOMMENDATIONS);
export const SeveritySchema = z.enum(["informational", "low", "medium", "high", "blocking"]);
export const StatusCountsSchema = z.object(Object.fromEntries(RESULT_STATUSES.map(status => [status, z.number().int().min(0)])));

export const EvidenceRefSchema = z.object({
  evidence_id: NonEmptyString,
  type: z.enum(["request", "response", "database_snapshot", "command_log", "manifest", "redacted_report", "screenshot", "browser_event_log", "browser_trace", "joined_observation"]),
  path: RelativePath,
  sha256: Sha256
});

export const RedactionSummarySchema = z.object({
  redacted_count: z.number().int().min(0),
  redacted_paths: z.array(NonEmptyString)
});

export const ApiAssertionSchema = z.object({
  kind: z.literal("api"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().startsWith("/"),
  expected_status: z.number().int().min(100).max(599),
  expected_headers: z.record(z.string(), NonEmptyString).optional(),
  expected_json: z.record(z.string(), z.unknown()).optional(),
  max_duration_ms: z.number().int().positive().optional()
});

export const DatabaseAssertionSchema = z.object({
  kind: z.literal("database"),
  check_id: NonEmptyString,
  description: NonEmptyString,
  expected: z.record(z.string(), z.unknown())
});

export const BrowserLocatorSchema = z.discriminatedUnion("strategy", [
  z.object({
    strategy: z.literal("css"),
    selector: NonEmptyString
  }),
  z.object({
    strategy: z.literal("role"),
    role: NonEmptyString,
    name: NonEmptyString
  })
]);

export const BrowserStepSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("goto"),
    path: z.string().startsWith("/")
  }),
  z.object({
    action: z.literal("fill"),
    target: BrowserLocatorSchema,
    value: z.string()
  }),
  z.object({
    action: z.literal("click"),
    target: BrowserLocatorSchema
  }),
  z.object({
    action: z.literal("expect_text"),
    target: BrowserLocatorSchema,
    text: NonEmptyString
  }),
  z.object({
    action: z.literal("expect_url"),
    path: z.string().startsWith("/")
  })
]);

export const BrowserFlowSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  flow_id: NonEmptyString,
  title: NonEmptyString,
  timeout_ms: z.number().int().positive().default(5000),
  steps: z.array(BrowserStepSchema).min(1)
});

export const JoinedAssertionSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  join_id: NonEmptyString,
  title: NonEmptyString,
  expected: z.record(z.string(), z.unknown()),
  sources: z.array(z.enum(["page", "api", "database"])).min(2)
});

export const DiffRiskSchema = z.object({
  risk_id: NonEmptyString,
  category: z.enum(["weakened_tests", "ci_bypass", "mock_or_fixture_change", "test_config_change"]),
  severity: z.enum(["low", "medium", "high"]),
  file: NonEmptyString,
  line_number: z.number().int().positive().nullable(),
  summary: NonEmptyString,
  evidence: NonEmptyString
});

export const DiffRiskReportSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  source: NonEmptyString,
  risk_count: z.number().int().min(0),
  risks: z.array(DiffRiskSchema),
  recommendation: z.enum(["no_diff_risk_detected", "human_review"])
});

export const ReadOnlyRuleReportSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  source: NonEmptyString,
  passed: z.boolean(),
  violations: z.array(NonEmptyString)
});

export const HardcodedProbeRunSchema = z.object({
  label: NonEmptyString,
  status: z.number().int().min(100).max(599),
  expected_status: z.number().int().min(100).max(599)
});

export const HardcodedProbeReportSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  source: NonEmptyString,
  control_run: HardcodedProbeRunSchema,
  randomized_runs: z.array(HardcodedProbeRunSchema).min(1),
  risk_count: z.number().int().min(0),
  risks: z.array(NonEmptyString),
  recommendation: z.enum(["no_hardcoded_behavior_detected", "human_review"])
});

export const AcceptanceCriterionSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  criterion_id: NonEmptyString,
  title: NonEmptyString,
  description: NonEmptyString,
  severity: SeveritySchema,
  assertions: z.array(z.discriminatedUnion("kind", [ApiAssertionSchema, DatabaseAssertionSchema])).min(1),
  manual_confirmation_required: z.literal(true)
});

export const AcceptanceCriterionConfirmationSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("draft") }),
  z.object({
    status: z.literal("user_confirmed"),
    confirmed_by: NonEmptyString,
    confirmed_at: NonEmptyString
  })
]);

export const AcceptanceCriterionVersionSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  version_id: NonEmptyString,
  criterion_id: NonEmptyString,
  version_number: z.number().int().positive(),
  previous_version_id: NonEmptyString.nullable(),
  criterion: AcceptanceCriterionSchema,
  change_summary: NonEmptyString,
  created_at: NonEmptyString,
  created_by: NonEmptyString,
  confirmation: AcceptanceCriterionConfirmationSchema
}).superRefine((version, ctx) => {
  if (version.criterion_id !== version.criterion.criterion_id) {
    ctx.addIssue({ code: "custom", path: ["criterion_id"], message: "must match criterion.criterion_id" });
  }
  if (version.version_number === 1 && version.previous_version_id !== null) {
    ctx.addIssue({ code: "custom", path: ["previous_version_id"], message: "must be null for the first version" });
  }
  if (version.version_number > 1 && version.previous_version_id === null) {
    ctx.addIssue({ code: "custom", path: ["previous_version_id"], message: "must reference the previous version" });
  }
});

export const CriterionResultSchema = z.object({
  criterion_id: NonEmptyString,
  status: ResultStatusSchema,
  summary: NonEmptyString,
  evidence: z.array(EvidenceRefSchema),
  errors: z.array(NonEmptyString).default([]),
  blocking_security_issue: z.boolean().default(false)
});

export const VerificationRunSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  run_id: NonEmptyString,
  commit: NonEmptyString,
  runner_profile: RelativePath,
  image_digest: Sha256,
  seed: NonEmptyString,
  criteria: z.array(AcceptanceCriterionSchema).min(1)
});

export const TestDataSeedSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  seed: NonEmptyString,
  purpose: NonEmptyString,
  values: z.record(z.string(), z.unknown())
});

export const EvidenceManifestSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  manifest_id: NonEmptyString,
  run_id: NonEmptyString,
  commit: NonEmptyString,
  runner_profile: RelativePath,
  image_digest: Sha256,
  seed: NonEmptyString,
  generated_at: NonEmptyString,
  evidence: z.array(EvidenceRefSchema),
  redaction: RedactionSummarySchema
});

export const VerificationReportSchema = z.object({
  schema_version: z.literal(DOMAIN_SCHEMA_VERSION),
  run_id: NonEmptyString,
  results: z.array(CriterionResultSchema),
  status_counts: StatusCountsSchema,
  merge_recommendation: MergeRecommendationSchema
});

export function domainJsonSchemas() {
  return {
    "acceptance-criterion.schema.json": z.toJSONSchema(AcceptanceCriterionSchema),
    "acceptance-criterion-version.schema.json": z.toJSONSchema(AcceptanceCriterionVersionSchema),
    "browser-flow.schema.json": z.toJSONSchema(BrowserFlowSchema),
    "diff-risk-report.schema.json": z.toJSONSchema(DiffRiskReportSchema),
    "evidence-manifest.schema.json": z.toJSONSchema(EvidenceManifestSchema),
    "hardcoded-probe-report.schema.json": z.toJSONSchema(HardcodedProbeReportSchema),
    "joined-assertion.schema.json": z.toJSONSchema(JoinedAssertionSchema),
    "readonly-rule-report.schema.json": z.toJSONSchema(ReadOnlyRuleReportSchema),
    "test-data-seed.schema.json": z.toJSONSchema(TestDataSeedSchema),
    "verification-run.schema.json": z.toJSONSchema(VerificationRunSchema),
    "verification-report.schema.json": z.toJSONSchema(VerificationReportSchema)
  };
}
