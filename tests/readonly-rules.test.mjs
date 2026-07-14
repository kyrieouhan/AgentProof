import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReadOnlyRules } from "../src/domain/readonly-rules.mjs";
import { domainJsonSchemas } from "../src/domain/schemas.mjs";

const profile = {
  mount_policy: {
    docker_socket: "forbidden",
    host_home: "forbidden",
    ssh_keys: "forbidden",
    real_env_files: "forbidden",
    rules: "read_only",
    workspace: "temporary_copy"
  },
  evidence_policy: {
    treat_target_outputs_as_untrusted: true
  }
};

test("read-only rules pass for the official runner boundary", () => {
  assert.equal(evaluateReadOnlyRules(profile).passed, true);
});

test("read-only rules report writable rule directories", () => {
  const report = evaluateReadOnlyRules({ ...profile, mount_policy: { ...profile.mount_policy, rules: "read_write" } });
  assert.equal(report.passed, false);
  assert.match(report.violations[0], /read_only/);
});

test("read-only rule report schema is generated", () => {
  assert.equal(domainJsonSchemas()["readonly-rule-report.schema.json"].properties.violations.type, "array");
});
