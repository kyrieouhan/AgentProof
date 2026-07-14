import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import {
  evaluateApiAssertion,
  evaluateCriterionAssertions,
  evaluateDatabaseAssertion,
  runApiAssertion
} from "../src/domain/assertions.mjs";
import { DOMAIN_SCHEMA_VERSION } from "../src/domain/schemas.mjs";

test("runs an API assertion against a local HTTP server", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(request.url === "/api/register" ? 201 : 404, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, user: { email: "a@example.com", role: "user" } }));
  });
  await listen(server);
  try {
    const { port } = server.address();
    const result = await runApiAssertion({
      kind: "api",
      method: "POST",
      path: "/api/register",
      expected_status: 201,
      expected_headers: { "content-type": "application/json" },
      expected_json: { ok: true, user: { role: "user" } },
      max_duration_ms: 1000
    }, { baseUrl: `http://127.0.0.1:${port}` });

    assert.equal(result.status, "passed");
    assert.deepEqual(result.errors, []);
  } finally {
    await close(server);
  }
});

test("API assertions fail with concrete mismatch errors", () => {
  const result = evaluateApiAssertion({
    kind: "api",
    method: "GET",
    path: "/api/admin",
    expected_status: 403,
    expected_json: { error: "forbidden" },
    max_duration_ms: 10
  }, {
    status: 200,
    headers: {},
    json: { ok: true },
    duration_ms: 25
  });

  assert.equal(result.status, "failed");
  assert.match(result.errors.join("\n"), /expected status 403/);
  assert.match(result.errors.join("\n"), /response JSON/);
  assert.match(result.errors.join("\n"), /duration/);
});

test("database assertions compare expected snapshot fields", () => {
  const assertion = {
    kind: "database",
    check_id: "user-created",
    description: "New user row exists",
    expected: { row_count_delta: 1, user: { email: "a@example.com" } }
  };

  assert.equal(evaluateDatabaseAssertion(assertion, {
    check_id: "user-created",
    actual: { row_count_delta: 1, user: { email: "a@example.com", password_hash: "hash" } }
  }).status, "passed");

  assert.equal(evaluateDatabaseAssertion(assertion, {
    check_id: "user-created",
    actual: { row_count_delta: 0 }
  }).status, "failed");
});

test("criterion assertion aggregation returns a CriterionResult-shaped object", () => {
  const criterion = {
    schema_version: DOMAIN_SCHEMA_VERSION,
    criterion_id: "ac-register",
    title: "Register succeeds",
    description: "Register writes a user and returns success.",
    severity: "high",
    manual_confirmation_required: true,
    assertions: [
      { kind: "api", method: "POST", path: "/api/register", expected_status: 201, expected_json: { ok: true } },
      { kind: "database", check_id: "user-created", description: "User row exists", expected: { row_count_delta: 1 } }
    ]
  };

  const result = evaluateCriterionAssertions(criterion, {
    api: { "/api/register": { status: 201, json: { ok: true }, headers: {}, duration_ms: 3 } },
    database: { "user-created": { check_id: "user-created", actual: { row_count_delta: 1 } } }
  });

  assert.equal(result.status, "passed");
  assert.equal(result.criterion_id, "ac-register");
});

function listen(server) {
  return new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
}

function close(server) {
  return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
