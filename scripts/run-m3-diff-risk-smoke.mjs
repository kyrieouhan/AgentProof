#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeDiffRisk, renderDiffRiskMarkdown } from "../src/domain/diff-risk.mjs";
import { createSmokeRunPaths } from "../src/runtime-paths.mjs";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const runId = `m3-diff-risk-${Date.now().toString(36)}`;
const paths = createSmokeRunPaths("m3-diff-risk", runId);
const artifactDir = paths.run_dir;
const patchPath = path.join(repoRoot, "samples", "demo-web-app", "defects", "weakened_tests", "defect.patch");
const diffText = fs.readFileSync(patchPath, "utf8");
const report = analyzeDiffRisk(diffText, { source: "official-demo-weakened-tests.patch" });
const summary = { ...report, run_id: runId, output_dir: artifactDir, summary_path: path.join(artifactDir, "summary.json") };

fs.writeFileSync(path.join(artifactDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(artifactDir, "report.md"), renderDiffRiskMarkdown(report), "utf8");

const passed = report.risks.some(risk => risk.category === "weakened_tests" && risk.severity === "high");
console.log(JSON.stringify({ status: passed ? "passed" : "failed", risks: report.risk_count, recommendation: report.recommendation, summary_path: summary.summary_path, output_dir: summary.output_dir }, null, 2));
if (!passed) process.exit(1);
