#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeDiffRisk, renderDiffRiskMarkdown } from "../src/domain/diff-risk.mjs";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const artifactDir = path.join(repoRoot, "artifacts", "m3-diff-risk");
const patchPath = path.join(repoRoot, "samples", "demo-web-app", "defects", "weakened_tests", "defect.patch");
const diffText = fs.readFileSync(patchPath, "utf8");
const report = analyzeDiffRisk(diffText, { source: "official-demo-weakened-tests.patch" });

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(artifactDir, "report.md"), renderDiffRiskMarkdown(report), "utf8");

const passed = report.risks.some(risk => risk.category === "weakened_tests" && risk.severity === "high");
console.log(JSON.stringify({ status: passed ? "passed" : "failed", risks: report.risk_count, recommendation: report.recommendation }, null, 2));
if (!passed) process.exit(1);
