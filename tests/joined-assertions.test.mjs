import assert from "node:assert/strict";
import test from "node:test";
import { DOMAIN_SCHEMA_VERSION, JoinedAssertionSchema, domainJsonSchemas } from "../src/domain/schemas.mjs";
import { demoTaskJoinedAssertion, evaluateJoinedAssertion } from "../src/domain/joined-assertions.mjs";

test("joined assertion schema is generated", () => {
  const assertion = JoinedAssertionSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    join_id: "join-demo-task",
    title: "Task is consistent",
    sources: ["page", "api", "database"],
    expected: {
      page: { task_visible: true },
      api: { status: 200 },
      database: { task_title: "Demo task" }
    }
  });

  assert.equal(assertion.sources.length, 3);
  assert.equal(domainJsonSchemas()["joined-assertion.schema.json"].properties.join_id.type, "string");
});

test("joined assertion passes only when page, API, and database all match", () => {
  const assertion = demoTaskJoinedAssertion({ taskTitle: "Demo task" });
  const passed = evaluateJoinedAssertion(assertion, {
    page: { task_visible: true },
    api: { status: 200, task_title: "Demo task", completed: false },
    database: { task_title: "Demo task", completed: false }
  });
  const failed = evaluateJoinedAssertion(assertion, {
    page: { task_visible: true },
    api: { status: 200, task_title: "Demo task", completed: false },
    database: { task_title: "Other task", completed: false }
  });

  assert.equal(passed.status, "passed");
  assert.equal(failed.status, "failed");
  assert.deepEqual(failed.errors, ["database observation did not match expected fields"]);
});
