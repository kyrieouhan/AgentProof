#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { runProfileCommands } from "../src/docker-runner.mjs";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : ".");
const outputDir = path.join(repoRoot, "artifacts", "m1-repeatability");
const sampleProfiles = [
  { id: "minimal-npm-api", profile: "samples/minimal-npm-api/agentproof.runner-profile.json" },
  { id: "minimal-npm-state", profile: "samples/minimal-npm-state/agentproof.runner-profile.json" },
  { id: "minimal-npm-files", profile: "samples/minimal-npm-files/agentproof.runner-profile.json" }
];
const repeatTarget = sampleProfiles[1];
const repeatCount = 10;

fs.mkdirSync(outputDir, { recursive: true });

const sampleRuns = sampleProfiles.map(sample => ({ sample: sample.id, ...summarize(runProfileCommands(sample.profile, { repoRoot })) }));
const repeatRuns = [];
for (let index = 0; index < repeatCount; index += 1) {
  repeatRuns.push({ iteration: index + 1, sample: repeatTarget.id, ...summarize(runProfileCommands(repeatTarget.profile, { repoRoot })) });
}

const repeatSignatures = repeatRuns.map(run => run.signature);
const uniqueRepeatSignatures = [...new Set(repeatSignatures)];
const status = sampleRuns.every(run => run.status === "passed") &&
  repeatRuns.every(run => run.status === "passed") &&
  uniqueRepeatSignatures.length === 1 ? "passed" : "failed";

const summary = {
  status,
  sample_count: sampleProfiles.length,
  repeat_target: repeatTarget.id,
  repeat_count: repeatCount,
  unique_repeat_signatures: uniqueRepeatSignatures.length,
  sample_runs: sampleRuns,
  repeat_runs: repeatRuns
};

fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "report.md"), renderReport(summary));
console.log(JSON.stringify({
  status,
  sample_count: summary.sample_count,
  repeat_target: summary.repeat_target,
  repeat_count: summary.repeat_count,
  unique_repeat_signatures: summary.unique_repeat_signatures,
  report: path.relative(repoRoot, path.join(outputDir, "report.md"))
}, null, 2));

if (status !== "passed") process.exit(1);

function summarize(result) {
  const phases = result.commands
    .filter(command => command.phase && !command.phase.includes(":cleanup"))
    .map(command => ({
      phase: command.phase,
      exitCode: command.exitCode,
      timedOut: command.timedOut,
      cancelled: command.cancelled,
      network: valueAfter(command.command, "--network"),
      cleanupExitCode: command.containerCleanup?.exitCode
    }));
  return {
    status: result.status,
    runId: result.runId,
    cleanup: result.cleanup,
    imageDigest: imageDigest(result.commands),
    errors: result.errors,
    phases,
    signature: JSON.stringify({ status: result.status, cleanup: result.cleanup, phases })
  };
}

function imageDigest(commands) {
  for (const command of commands) {
    const match = command.stdout?.match(/sha256:[a-f0-9]+/i);
    if (match) return match[0];
  }
  return "";
}

function valueAfter(items, key) {
  const index = items.indexOf(key);
  return index === -1 ? null : items[index + 1];
}

function renderReport(summary) {
  const sampleRows = summary.sample_runs.map(run => `| ${run.sample} | ${run.status} | ${run.cleanup} | ${run.imageDigest} | ${run.phases.map(phase => `${phase.phase}:${phase.exitCode}`).join(", ")} |`).join("\n");
  const repeatRows = summary.repeat_runs.map(run => `| ${run.iteration} | ${run.status} | ${run.cleanup} | ${run.signature === summary.repeat_runs[0].signature ? "yes" : "no"} |`).join("\n");
  return `# M1 Repeatability Report

Status: ${summary.status}

## Sample runs

| Sample | Status | Cleanup | Image digest | Phase exit codes |
| --- | --- | --- | --- | --- |
${sampleRows}

## Repeatability

- Repeat target: ${summary.repeat_target}
- Repeat count: ${summary.repeat_count}
- Unique signatures: ${summary.unique_repeat_signatures}

| Iteration | Status | Cleanup | Matches first signature |
| --- | --- | --- | --- |
${repeatRows}
`;
}
