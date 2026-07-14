import { DOMAIN_SCHEMA_VERSION, JoinedAssertionSchema } from "./schemas.mjs";

export function evaluateJoinedAssertion(assertion, observation) {
  const parsed = JoinedAssertionSchema.parse(assertion);
  const errors = [];

  if (parsed.sources.includes("page") && !matchesObject(parsed.expected.page ?? {}, observation.page ?? {})) {
    errors.push("page observation did not match expected fields");
  }
  if (parsed.sources.includes("api") && !matchesObject(parsed.expected.api ?? {}, observation.api ?? {})) {
    errors.push("API observation did not match expected fields");
  }
  if (parsed.sources.includes("database") && !matchesObject(parsed.expected.database ?? {}, observation.database ?? {})) {
    errors.push("database observation did not match expected fields");
  }

  return {
    criterion_id: parsed.join_id,
    status: errors.length ? "failed" : "passed",
    summary: errors.length ? "Joined assertion failed" : "Page, API, and database observations matched",
    evidence: observation.evidence ?? [],
    errors,
    blocking_security_issue: false
  };
}

export function demoTaskJoinedAssertion({ taskTitle }) {
  return {
    schema_version: DOMAIN_SCHEMA_VERSION,
    join_id: "demo-page-api-db-task-consistency",
    title: "Task is consistent across page, API, and database",
    sources: ["page", "api", "database"],
    expected: {
      page: { task_visible: true },
      api: { status: 200, task_title: taskTitle, completed: false },
      database: { task_title: taskTitle, completed: false }
    }
  };
}

function matchesObject(expected, actual) {
  if (!isPlainObject(expected) || !isPlainObject(actual)) return Object.is(expected, actual);
  return Object.entries(expected).every(([key, value]) => matchesObject(value, actual[key]));
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
