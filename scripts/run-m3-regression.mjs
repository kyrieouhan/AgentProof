#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const demoRoot = path.join(repoRoot, "samples", "demo-web-app");
const artifactDir = path.join(repoRoot, "artifacts", "m3-regression");
fs.mkdirSync(artifactDir, { recursive: true });

const browserRuns = [];
for (let index = 0; index < 3; index += 1) {
  run("node", ["scripts/run-m3-browser-smoke.mjs", "--repo-root", "."], { cwd: repoRoot });
  const summary = JSON.parse(fs.readFileSync(path.join(repoRoot, "artifacts", "m3-browser-smoke", "summary.json"), "utf8"));
  browserRuns.push({
    run_id: summary.run_id,
    status: summary.status,
    recommendation: summary.report.merge_recommendation,
    passed: summary.report.status_counts.passed,
    failed: summary.report.status_counts.failed
  });
}

const defects = parseDefects(run("node", ["scripts/verify-defect-scenarios.mjs"], { cwd: demoRoot }).stdout);
const diffRiskBefore = readJsonIfExists(path.join(repoRoot, "artifacts", "m3-diff-risk", "summary.json"));
run("node", ["scripts/run-m3-diff-risk-smoke.mjs", "--repo-root", "."], { cwd: repoRoot });
const diffRiskAfter = JSON.parse(fs.readFileSync(path.join(repoRoot, "artifacts", "m3-diff-risk", "summary.json"), "utf8"));
run("node", ["scripts/run-m3-hardcoded-smoke.mjs", "--repo-root", "."], { cwd: repoRoot });
const hardcoded = JSON.parse(fs.readFileSync(path.join(repoRoot, "artifacts", "m3-hardcoded-randomization", "summary.json"), "utf8"));
const usability = usabilityCheck();

const browserConsistent = browserRuns.every(run => run.status === "passed" && run.recommendation === "recommend_merge" && run.passed === 2 && run.failed === 0);
const defectsPassed = defects.scenarios.every(scenario => scenario.status === "reproduced");
const diffRiskPassed = diffRiskAfter.risks.some(risk => risk.category === "weakened_tests" && risk.severity === "high");
const hardcodedPassed = hardcoded.readonly.passed && hardcoded.hardcoded.recommendation === "human_review";
const status = browserConsistent && defectsPassed && diffRiskPassed && hardcodedPassed && usability.passed ? "passed" : "failed";
const summary = {
  status,
  browser_repeatability: {
    repeat_count: browserRuns.length,
    consistent: browserConsistent,
    runs: browserRuns
  },
  official_defects: defects,
  diff_risk: diffRiskAfter,
  hardcoded_randomization: hardcoded,
  usability,
  previous_diff_risk_snapshot: {
    available: Boolean(diffRiskBefore),
    risk_count: diffRiskBefore?.risk_count ?? null,
    recommendation: diffRiskBefore?.recommendation ?? null
  }
};

fs.writeFileSync(path.join(artifactDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(artifactDir, "report.md"), renderReport(summary), "utf8");
console.log(JSON.stringify({ status, browser_repeats: browserRuns.length, defects: defects.scenarios.length, usability: usability.passed }, null, 2));
if (status !== "passed") process.exit(1);

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
  return result;
}

function parseDefects(stdout) {
  const marker = '{\n  "scenarios"';
  const index = stdout.lastIndexOf(marker);
  if (index < 0) throw new Error("Could not find defect scenario JSON.");
  return JSON.parse(stdout.slice(index));
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function usabilityCheck() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const executionStatus = fs.readFileSync(path.join(repoRoot, "docs", "execution-status.md"), "utf8");
  const requiredScripts = ["m3:browser-smoke", "m3:diff-risk", "m3:hardcoded"];
  const missingScripts = requiredScripts.filter(name => !packageJson.scripts?.[name]);
  const requiredArtifacts = [
    "artifacts/m3-browser-smoke/summary.json",
    "artifacts/m3-diff-risk/summary.json",
    "artifacts/m3-hardcoded-randomization/summary.json"
  ];
  const missingArtifacts = requiredArtifacts.filter(file => !fs.existsSync(path.join(repoRoot, file)));
  const issues = [
    ...missingScripts.map(name => `missing package script ${name}`),
    ...missingArtifacts.map(file => `missing artifact ${file}`)
  ];
  if (!executionStatus.includes("M3-06")) issues.push("docs/execution-status.md does not mention M3-06");
  return {
    passed: issues.length === 0,
    issues,
    required_scripts: requiredScripts,
    required_artifacts: requiredArtifacts
  };
}

function renderReport(summary) {
  return `# AgentProof M3 Regression Report

- Status: ${summary.status}
- Browser repeatability: ${summary.browser_repeatability.repeat_count}/3 runs, consistent=${summary.browser_repeatability.consistent}
- Official defects reproduced: ${summary.official_defects.scenarios.filter(scenario => scenario.status === "reproduced").length}/${summary.official_defects.scenarios.length}
- Diff risk recommendation: ${summary.diff_risk.recommendation}
- Hardcoded recommendation: ${summary.hardcoded_randomization.hardcoded.recommendation}
- Usability check: ${summary.usability.passed}

## Browser runs

${summary.browser_repeatability.runs.map(run => `- ${run.run_id}: ${run.status}, passed=${run.passed}, failed=${run.failed}`).join("\n")}

## Official defects

${summary.official_defects.scenarios.map(scenario => `- ${scenario.scenario}: ${scenario.status}`).join("\n")}
`;
}
