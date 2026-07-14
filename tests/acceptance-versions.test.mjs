import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmCriterionVersion,
  createCriterionVersion,
  criterionForRun,
  reviseCriterionVersion
} from "../src/domain/acceptance-versions.mjs";
import { AcceptanceCriterionVersionSchema, DOMAIN_SCHEMA_VERSION } from "../src/domain/schemas.mjs";

test("creates a draft acceptance criterion version", () => {
  const version = createCriterionVersion(baseCriterion(), metadata("acv-1"));

  assert.equal(version.version_number, 1);
  assert.equal(version.previous_version_id, null);
  assert.equal(version.confirmation.status, "draft");
  assert.equal(AcceptanceCriterionVersionSchema.parse(version).version_id, "acv-1");
});

test("editing creates an independent draft version and preserves the prior version", () => {
  const original = createCriterionVersion(baseCriterion(), metadata("acv-1"));
  const revisedCriterion = { ...original.criterion, title: "Register trims and normalizes email" };
  const revised = reviseCriterionVersion(original, revisedCriterion, metadata("acv-2", "Clarify email normalization"));

  assert.equal(original.version_number, 1);
  assert.equal(original.criterion.title, "Register succeeds");
  assert.equal(revised.version_number, 2);
  assert.equal(revised.previous_version_id, "acv-1");
  assert.equal(revised.criterion.title, "Register trims and normalizes email");
  assert.equal(revised.confirmation.status, "draft");
});

test("user confirmation is explicit and required before a criterion can enter a run", () => {
  const draft = createCriterionVersion(baseCriterion(), metadata("acv-1"));
  assert.throws(() => criterionForRun(draft), /user_confirmed/);

  const confirmed = confirmCriterionVersion(draft, { confirmed_by: "local-user", confirmed_at: "2026-07-13T00:00:00.000Z" });
  assert.equal(confirmed.confirmation.status, "user_confirmed");
  assert.equal(criterionForRun(confirmed).criterion_id, "ac-register");
});

test("a revision cannot change the criterion identity", () => {
  const original = createCriterionVersion(baseCriterion(), metadata("acv-1"));
  assert.throws(
    () => reviseCriterionVersion(original, { ...original.criterion, criterion_id: "ac-other" }, metadata("acv-2")),
    /criterion_id/
  );
});

function baseCriterion() {
  return {
    schema_version: DOMAIN_SCHEMA_VERSION,
    criterion_id: "ac-register",
    title: "Register succeeds",
    description: "A valid registration request returns 201 and creates a persistent user.",
    severity: "high",
    manual_confirmation_required: true,
    assertions: [{ kind: "api", method: "POST", path: "/api/register", expected_status: 201 }]
  };
}

function metadata(version_id, change_summary = "Initial draft") {
  return {
    version_id,
    change_summary,
    created_at: "2026-07-13T00:00:00.000Z",
    created_by: "codex"
  };
}
