import { DiffRiskReportSchema, DOMAIN_SCHEMA_VERSION } from "./schemas.mjs";

export function analyzeDiffRisk(diffText, { source = "git-diff" } = {}) {
  const risks = [];
  let file = "";
  let oldLine = null;
  let newLine = null;

  for (const rawLine of diffText.split(/\r?\n/)) {
    if (rawLine.startsWith("diff --git ")) {
      file = rawLine.match(/ b\/(.+)$/)?.[1] ?? file;
      continue;
    }
    if (rawLine.startsWith("+++ b/")) {
      file = rawLine.slice("+++ b/".length);
      continue;
    }
    const hunk = rawLine.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      checkAddition(risks, file, newLine, rawLine.slice(1));
      if (newLine !== null) newLine += 1;
      continue;
    }
    if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      checkDeletion(risks, file, oldLine, rawLine.slice(1));
      if (oldLine !== null) oldLine += 1;
      continue;
    }
    if (!rawLine.startsWith("\\") && oldLine !== null && newLine !== null) {
      oldLine += 1;
      newLine += 1;
    }
  }

  return DiffRiskReportSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    source,
    risk_count: risks.length,
    risks: risks.map((risk, index) => ({ risk_id: `diff-risk-${index + 1}`, ...risk })),
    recommendation: risks.length ? "human_review" : "no_diff_risk_detected"
  });
}

export function renderDiffRiskMarkdown(report) {
  const rows = report.risks.map(risk => `| ${cell(risk.risk_id)} | ${cell(risk.severity)} | ${cell(risk.category)} | ${cell(risk.file)}:${risk.line_number ?? "?"} | ${cell(risk.summary)} |`).join("\n");
  return `# AgentProof Diff Risk Report

- Source: ${report.source}
- Recommendation: ${report.recommendation}
- Risk count: ${report.risk_count}

| Risk | Severity | Category | Location | Summary |
| --- | --- | --- | --- | --- |
${rows || "| - | - | - | - | No diff risk detected. |"}
`;
}

function checkAddition(risks, file, lineNumber, line) {
  if (isTestFile(file) && /\b(?:it|test|describe)\.skip\b|\bskip\(/.test(line)) {
    risks.push(risk("weakened_tests", "high", file, lineNumber, "Test case or suite is skipped", line));
  }
  if (isTestFile(file) && /\b(?:it|test|describe)\.only\b/.test(line)) {
    risks.push(risk("weakened_tests", "medium", file, lineNumber, "Focused test marker may hide the full suite", line));
  }
  if (isCiFile(file) && /continue-on-error:\s*true|\|\|\s*true|exit\s+0|--passWithNoTests/.test(line)) {
    risks.push(risk("ci_bypass", "high", file, lineNumber, "CI or test command can ignore failures", line));
  }
  if (isConfigFile(file) && /(testPathIgnorePatterns|exclude|skip|allow_failure)/i.test(line)) {
    risks.push(risk("test_config_change", "medium", file, lineNumber, "Test configuration may exclude checks", line));
  }
  if (isMockOrFixture(file)) {
    risks.push(risk("mock_or_fixture_change", "medium", file, lineNumber, "Mock or fixture changed; verify it is equivalent", line));
  }
}

function checkDeletion(risks, file, lineNumber, line) {
  if (isTestFile(file) && /\b(expect|assert|should)\b|\.to(?:Equal|Be|Contain|Throw|Match)\b/.test(line)) {
    risks.push(risk("weakened_tests", "high", file, lineNumber, "Assertion removed from a test file", line));
  }
  if (isMockOrFixture(file)) {
    risks.push(risk("mock_or_fixture_change", "medium", file, lineNumber, "Mock or fixture changed; verify it is equivalent", line));
  }
}

function risk(category, severity, file, line_number, summary, evidence) {
  return { category, severity, file, line_number, summary, evidence: evidence.trim() };
}

function isTestFile(file) {
  return /(^|\/)(tests?|__tests__)\/|\.test\.|\.spec\./i.test(file);
}

function isCiFile(file) {
  return /^\.github\/workflows\//.test(file) || /(^|\/)(ci|build)\.(ya?ml|json)$/i.test(file);
}

function isConfigFile(file) {
  return /(vitest|jest|playwright|cypress|package)\.(config\.)?(js|ts|mjs|json)$/i.test(file) || file === "package.json";
}

function isMockOrFixture(file) {
  return /(^|\/)(__mocks__|mocks?|fixtures?)\//i.test(file);
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}
