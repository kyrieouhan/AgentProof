import { DOMAIN_SCHEMA_VERSION, HardcodedProbeReportSchema } from "./schemas.mjs";

export function evaluateHardcodedProbe(input) {
  const risks = [];
  const controlPassed = input.control_run.status === input.control_run.expected_status;
  const randomizedFailures = input.randomized_runs.filter(run => run.status !== run.expected_status);

  if (controlPassed && randomizedFailures.length > 0) {
    risks.push(`${randomizedFailures.length} randomized equivalent input(s) failed while the fixed control input passed`);
  }

  return HardcodedProbeReportSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    source: input.source,
    control_run: input.control_run,
    randomized_runs: input.randomized_runs,
    risk_count: risks.length,
    risks,
    recommendation: risks.length ? "human_review" : "no_hardcoded_behavior_detected"
  });
}

export function renderHardcodedMarkdown(report, readonlyReport) {
  return `# VeriCrate Hardcoded Behavior Probe

## Read-only rules

- Source: ${readonlyReport.source}
- Passed: ${readonlyReport.passed}
- Violations: ${readonlyReport.violations.length ? readonlyReport.violations.join("; ") : "none"}

## Randomized input probe

- Source: ${report.source}
- Recommendation: ${report.recommendation}
- Risk count: ${report.risk_count}
- Control: ${report.control_run.label} => ${report.control_run.status}
- Randomized runs: ${report.randomized_runs.map(run => `${run.label} => ${run.status}`).join("; ")}
- Risks: ${report.risks.length ? report.risks.join("; ") : "none"}
`;
}
