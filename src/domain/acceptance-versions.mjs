import { AcceptanceCriterionSchema, AcceptanceCriterionVersionSchema, DOMAIN_SCHEMA_VERSION } from "./schemas.mjs";

export function createCriterionVersion(criterion, metadata) {
  const parsedCriterion = AcceptanceCriterionSchema.parse(criterion);
  return AcceptanceCriterionVersionSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    version_id: required(metadata.version_id, "version_id"),
    criterion_id: parsedCriterion.criterion_id,
    version_number: 1,
    previous_version_id: null,
    criterion: parsedCriterion,
    change_summary: required(metadata.change_summary, "change_summary"),
    created_at: required(metadata.created_at, "created_at"),
    created_by: required(metadata.created_by, "created_by"),
    confirmation: { status: "draft" }
  });
}

export function reviseCriterionVersion(previousVersion, nextCriterion, metadata) {
  const previous = AcceptanceCriterionVersionSchema.parse(previousVersion);
  const criterion = AcceptanceCriterionSchema.parse(nextCriterion);
  if (criterion.criterion_id !== previous.criterion_id) {
    throw new Error("revised criterion_id must match the previous version");
  }
  return AcceptanceCriterionVersionSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    version_id: required(metadata.version_id, "version_id"),
    criterion_id: criterion.criterion_id,
    version_number: previous.version_number + 1,
    previous_version_id: previous.version_id,
    criterion,
    change_summary: required(metadata.change_summary, "change_summary"),
    created_at: required(metadata.created_at, "created_at"),
    created_by: required(metadata.created_by, "created_by"),
    confirmation: { status: "draft" }
  });
}

export function confirmCriterionVersion(version, metadata) {
  const parsed = AcceptanceCriterionVersionSchema.parse(version);
  if (parsed.confirmation.status === "user_confirmed") {
    throw new Error("criterion version is already user_confirmed");
  }
  return AcceptanceCriterionVersionSchema.parse({
    ...parsed,
    confirmation: {
      status: "user_confirmed",
      confirmed_by: required(metadata.confirmed_by, "confirmed_by"),
      confirmed_at: required(metadata.confirmed_at, "confirmed_at")
    }
  });
}

export function criterionForRun(version) {
  const parsed = AcceptanceCriterionVersionSchema.parse(version);
  if (parsed.confirmation.status !== "user_confirmed") {
    throw new Error("acceptance criterion version must be user_confirmed before verification");
  }
  return parsed.criterion;
}

function required(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  return value;
}
