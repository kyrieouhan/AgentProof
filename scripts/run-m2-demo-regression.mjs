#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEvidenceManifest, evidenceRef } from "../src/domain/manifest.mjs";
import { createVerificationReport, renderHtmlReport, renderMarkdownReport } from "../src/domain/report.mjs";
import { redactSensitive } from "../src/domain/redaction.mjs";
import { DOMAIN_SCHEMA_VERSION } from "../src/domain/schemas.mjs";
import { demoRegistrationData } from "../src/domain/test-data.mjs";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const demoRoot = path.join(repoRoot, "samples", "demo-web-app");
const artifactDir = path.join(repoRoot, "artifacts", "m2-demo-regression");
const runId = `m2-demo-${Date.now().toString(36)}`;
const seed = "m2-demo-regression-seed";

fs.mkdirSync(artifactDir, { recursive: true });

const baselineEnv = { DATABASE_URL: "file:./prisma/m2-baseline.db" };
cleanupDatabase("m2-baseline");
const commands = [];
commands.push(run("node", ["scripts/init-db.mjs", "--reset"], { cwd: demoRoot, env: baselineEnv }));
const baselineCommand = run(tsxCommand(), ["scripts/probe-m0-feasibility.mjs"], { cwd: demoRoot, env: baselineEnv });
commands.push(baselineCommand);
const baseline = parseLastJsonLine(baselineCommand.stdout);

const defectsCommand = run("node", ["scripts/verify-defect-scenarios.mjs"], { cwd: demoRoot });
commands.push(defectsCommand);
const defects = parseDefects(defectsCommand.stdout);

const commit = run("git", ["rev-parse", "HEAD"], { cwd: repoRoot }).stdout.trim();
const isolation = JSON.parse(fs.readFileSync(path.join(repoRoot, "artifacts", "m1-isolation-smoke", "summary.json"), "utf8"));
const seedRecord = demoRegistrationData(seed);
const redaction = redactSensitive({ baseline, defects });
const results = [
  criterionResult("demo-correct-baseline", baseline.status === "passed", "Correct baseline API/database/security checks"),
  ...defects.scenarios.map(scenario => criterionResult(`defect-${scenario.scenario}`, scenario.status === "reproduced", `Official defect ${scenario.scenario} is distinguishable`))
];
const report = createVerificationReport({ run_id: runId, results });
const evidence = [
  evidenceRef({ evidence_id: "ev-baseline", type: "response", path: "artifacts/m2-demo-regression/baseline.json", content: baseline }),
  evidenceRef({ evidence_id: "ev-defects", type: "response", path: "artifacts/m2-demo-regression/defects.json", content: defects }),
  evidenceRef({ evidence_id: "ev-seed", type: "manifest", path: "artifacts/m2-demo-regression/seed.json", content: seedRecord })
];
const manifest = createEvidenceManifest({
  manifest_id: `manifest-${runId}`,
  generated_at: new Date().toISOString(),
  run: {
    schema_version: DOMAIN_SCHEMA_VERSION,
    run_id: runId,
    commit,
    runner_profile: "samples/demo-web-app/vericrate.runner-profile.json",
    image_digest: isolation.image_digest,
    seed
  },
  evidence,
  redaction: redaction.summary
});

const summary = {
  status: report.merge_recommendation === "recommend_merge" ? "passed" : "failed",
  run_id: runId,
  commit,
  seed: seedRecord,
  baseline,
  defects,
  report,
  manifest,
  commands: commands.map(({ command, exitCode, durationMs }) => ({ command, exitCode, durationMs }))
};

writeJson("baseline.json", baseline);
writeJson("defects.json", defects);
writeJson("seed.json", seedRecord);
writeJson("manifest.json", manifest);
writeJson("summary.json", summary);
fs.writeFileSync(path.join(artifactDir, "report.md"), renderMarkdownReport(report), "utf8");
fs.writeFileSync(path.join(artifactDir, "report.html"), renderHtmlReport(report), "utf8");
cleanupDatabase("m2-baseline");

console.log(JSON.stringify({ status: summary.status, run_id: runId, criteria: report.results.length, recommendation: report.merge_recommendation }, null, 2));
if (summary.status !== "passed") process.exit(1);

function criterionResult(criterion_id, passed, summary) {
  return {
    criterion_id,
    status: passed ? "passed" : "failed",
    summary,
    evidence: [],
    errors: passed ? [] : [`${criterion_id} did not produce expected evidence`],
    blocking_security_issue: false
  };
}

function run(command, args, options) {
  const spec = commandSpec(command, args);
  const started = Date.now();
  const result = spawnSync(spec.command, spec.args, {
    cwd: options.cwd,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    encoding: "utf8",
    shell: false
  });
  const record = {
    command: [command, ...args].join(" "),
    exitCode: result.status,
    durationMs: Date.now() - started,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stdout.write(record.stdout);
    process.stderr.write(record.stderr);
    throw new Error(`${record.command} failed with exit code ${result.status ?? "unknown"}`);
  }
  return record;
}

function commandSpec(command, args) {
  if (process.platform === "win32" && command.endsWith(".cmd")) {
    return { command: process.env.ComSpec || "cmd.exe", args: ["/d", "/s", "/c", command, ...args] };
  }
  return { command, args };
}

function tsxCommand() {
  return path.join(demoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
}

function parseLastJsonLine(stdout) {
  return JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
}

function parseDefects(stdout) {
  const marker = '{\n  "scenarios"';
  const index = stdout.lastIndexOf(marker);
  if (index < 0) throw new Error("Could not find defect scenario JSON.");
  return JSON.parse(stdout.slice(index));
}

function cleanupDatabase(name) {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    fs.rmSync(path.join(demoRoot, "prisma", `${name}.db${suffix}`), { force: true });
  }
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(artifactDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
