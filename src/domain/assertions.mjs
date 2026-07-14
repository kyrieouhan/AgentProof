import { ApiAssertionSchema, DatabaseAssertionSchema } from "./schemas.mjs";

export async function runApiAssertion(assertion, options) {
  const parsed = ApiAssertionSchema.parse(assertion);
  const baseUrl = required(options.baseUrl, "baseUrl").replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const started = Date.now();
  const response = await fetchImpl(`${baseUrl}${parsed.path}`, { method: parsed.method, headers: options.headers });
  const text = await response.text();
  const duration_ms = Date.now() - started;
  return evaluateApiAssertion(parsed, {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body_text: text,
    json: parseJson(text),
    duration_ms
  });
}

export function evaluateApiAssertion(assertion, observed) {
  const parsed = ApiAssertionSchema.parse(assertion);
  const errors = [];

  if (observed.status !== parsed.expected_status) {
    errors.push(`expected status ${parsed.expected_status}, got ${observed.status}`);
  }
  for (const [name, expected] of Object.entries(parsed.expected_headers ?? {})) {
    const actual = headerValue(observed.headers ?? {}, name);
    if (actual !== expected) errors.push(`expected header ${name}=${expected}, got ${actual ?? "missing"}`);
  }
  if (parsed.expected_json && !matchesObject(parsed.expected_json, observed.json)) {
    errors.push("response JSON did not include expected fields");
  }
  if (parsed.max_duration_ms && observed.duration_ms > parsed.max_duration_ms) {
    errors.push(`expected duration <= ${parsed.max_duration_ms}ms, got ${observed.duration_ms}ms`);
  }

  return assertionResult(errors, errors.length ? "API assertion failed" : "API assertion passed");
}

export function evaluateDatabaseAssertion(assertion, observed) {
  const parsed = DatabaseAssertionSchema.parse(assertion);
  if (observed.check_id !== parsed.check_id) {
    return assertionResult([`expected database check ${parsed.check_id}, got ${observed.check_id ?? "missing"}`], "Database assertion failed");
  }
  const errors = matchesObject(parsed.expected, observed.actual) ? [] : ["database snapshot did not include expected fields"];
  return assertionResult(errors, errors.length ? "Database assertion failed" : "Database assertion passed");
}

export function evaluateCriterionAssertions(criterion, observations) {
  const results = criterion.assertions.map(assertion => {
    if (assertion.kind === "api") {
      return evaluateApiAssertion(assertion, observations.api?.[assertion.path] ?? {});
    }
    return evaluateDatabaseAssertion(assertion, observations.database?.[assertion.check_id] ?? {});
  });
  const errors = results.flatMap(result => result.errors);
  return {
    criterion_id: criterion.criterion_id,
    status: errors.length ? "failed" : "passed",
    summary: errors.length ? "One or more assertions failed" : "All assertions passed",
    evidence: [],
    errors,
    blocking_security_issue: false
  };
}

function assertionResult(errors, summary) {
  return { status: errors.length ? "failed" : "passed", summary, errors };
}

function matchesObject(expected, actual) {
  if (!isPlainObject(expected) || !isPlainObject(actual)) return Object.is(expected, actual);
  return Object.entries(expected).every(([key, value]) => matchesObject(value, actual[key]));
}

function headerValue(headers, name) {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function required(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  return value;
}
