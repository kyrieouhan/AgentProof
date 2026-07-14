#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateHardcodedProbe, renderHardcodedMarkdown } from "../src/domain/hardcoded-detection.mjs";
import { evaluateReadOnlyRules } from "../src/domain/readonly-rules.mjs";
import { createSmokeRunPaths } from "../src/runtime-paths.mjs";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const demoRoot = path.join(repoRoot, "samples", "demo-web-app");
const runId = `m3-hardcoded-${Date.now().toString(36)}`;
const paths = createSmokeRunPaths("m3-hardcoded-randomization", runId);
const artifactDir = paths.run_dir;

const profile = JSON.parse(fs.readFileSync(path.join(demoRoot, "agentproof.runner-profile.json"), "utf8"));
const readonlyReport = evaluateReadOnlyRules(profile, { source: "samples/demo-web-app/agentproof.runner-profile.json" });
const defect = run("node", ["scripts/verify-defect-scenarios.mjs", "hardcoded_behavior"], { cwd: demoRoot });
const observed = parseDefectObservation(defect.stdout);
const hardcodedReport = evaluateHardcodedProbe({
  source: "official-demo-hardcoded-behavior",
  control_run: { label: "fixed-demo-email", status: observed.fixedEmailStatus, expected_status: 201 },
  randomized_runs: [{ label: "random-equivalent-email", status: observed.randomEmailStatus, expected_status: 201 }]
});
const summary = {
  run_id: runId,
  status: readonlyReport.passed && hardcodedReport.recommendation === "human_review" ? "passed" : "failed",
  output_dir: artifactDir,
  summary_path: path.join(artifactDir, "summary.json"),
  readonly: readonlyReport,
  hardcoded: hardcodedReport
};

fs.writeFileSync(path.join(artifactDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(artifactDir, "report.md"), renderHardcodedMarkdown(hardcodedReport, readonlyReport), "utf8");
console.log(JSON.stringify({ status: summary.status, hardcoded_risks: hardcodedReport.risk_count, readonly_passed: readonlyReport.passed, summary_path: summary.summary_path, output_dir: summary.output_dir }, null, 2));
if (summary.status !== "passed") process.exit(1);

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

function parseDefectObservation(stdout) {
  const marker = '{\n  "scenarios"';
  const index = stdout.lastIndexOf(marker);
  if (index < 0) throw new Error("Could not find defect scenario JSON.");
  return JSON.parse(stdout.slice(index)).scenarios[0].observed;
}
