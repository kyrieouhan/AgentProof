import assert from "node:assert/strict";
import test from "node:test";
import { evidenceRef, createEvidenceManifest, hashContent } from "../src/domain/manifest.mjs";
import { redactSensitive } from "../src/domain/redaction.mjs";
import { DOMAIN_SCHEMA_VERSION, EvidenceManifestSchema } from "../src/domain/schemas.mjs";

test("redacts sensitive headers and nested fields", () => {
  const result = redactSensitive({
    headers: {
      authorization: "Bearer secret",
      cookie: "sid=secret",
      "content-type": "application/json"
    },
    body: {
      email: "a@example.test",
      password: "secret",
      nested: { access_token: "secret" }
    }
  });

  assert.equal(result.value.headers.authorization, "[REDACTED]");
  assert.equal(result.value.headers.cookie, "[REDACTED]");
  assert.equal(result.value.headers["content-type"], "application/json");
  assert.equal(result.value.body.password, "[REDACTED]");
  assert.equal(result.value.body.nested.access_token, "[REDACTED]");
  assert.deepEqual(result.summary.redacted_paths.sort(), ["body.nested.access_token", "body.password", "headers.authorization", "headers.cookie"]);
});

test("evidence refs hash raw content and manifest binds run context", () => {
  const request = evidenceRef({
    evidence_id: "ev-request-1",
    type: "request",
    path: "evidence/request-1.json",
    content: { method: "POST", path: "/api/register" }
  });
  const redacted = redactSensitive({ authorization: "Bearer secret" });
  const manifest = createEvidenceManifest({
    manifest_id: "manifest-1",
    generated_at: "2026-07-13T00:00:00.000Z",
    run: {
      schema_version: DOMAIN_SCHEMA_VERSION,
      run_id: "vr-1",
      commit: "abc123",
      runner_profile: "samples/demo-web-app/agentproof.runner-profile.json",
      image_digest: "sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5",
      seed: "seed-1"
    },
    evidence: [request],
    redaction: redacted.summary
  });

  assert.equal(manifest.evidence[0].sha256, hashContent({ method: "POST", path: "/api/register" }));
  assert.equal(manifest.commit, "abc123");
  assert.equal(EvidenceManifestSchema.parse(manifest).redaction.redacted_count, 1);
});
