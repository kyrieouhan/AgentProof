import { DOMAIN_SCHEMA_VERSION, ReadOnlyRuleReportSchema } from "./schemas.mjs";

export function evaluateReadOnlyRules(profile, { source = "runner-profile" } = {}) {
  const violations = [];
  const mount = profile.mount_policy ?? {};
  const evidence = profile.evidence_policy ?? {};

  requireValue(mount.rules === "read_only", "mount_policy.rules must be read_only", violations);
  requireValue(mount.workspace === "temporary_copy", "mount_policy.workspace must be temporary_copy", violations);
  requireValue(mount.docker_socket === "forbidden", "mount_policy.docker_socket must be forbidden", violations);
  requireValue(mount.host_home === "forbidden", "mount_policy.host_home must be forbidden", violations);
  requireValue(mount.ssh_keys === "forbidden", "mount_policy.ssh_keys must be forbidden", violations);
  requireValue(mount.real_env_files === "forbidden", "mount_policy.real_env_files must be forbidden", violations);
  requireValue(evidence.treat_target_outputs_as_untrusted === true, "evidence_policy.treat_target_outputs_as_untrusted must be true", violations);

  return ReadOnlyRuleReportSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    source,
    passed: violations.length === 0,
    violations
  });
}

function requireValue(condition, message, violations) {
  if (!condition) violations.push(message);
}
