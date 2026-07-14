import crypto from "node:crypto";
import { EvidenceManifestSchema, EvidenceRefSchema } from "./schemas.mjs";

export function evidenceRef({ evidence_id, type, path, content }) {
  return EvidenceRefSchema.parse({
    evidence_id,
    type,
    path,
    sha256: hashContent(content)
  });
}

export function createEvidenceManifest(input) {
  return EvidenceManifestSchema.parse({
    schema_version: input.run.schema_version,
    manifest_id: input.manifest_id,
    run_id: input.run.run_id,
    commit: input.run.commit,
    runner_profile: input.run.runner_profile,
    image_digest: input.run.image_digest,
    seed: input.run.seed,
    generated_at: input.generated_at,
    evidence: input.evidence,
    redaction: input.redaction
  });
}

export function hashContent(content) {
  const bytes = typeof content === "string" || Buffer.isBuffer(content) ? content : JSON.stringify(content);
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}
