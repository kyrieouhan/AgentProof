#!/usr/bin/env node
import { checkDocker } from "../src/docker-preflight.mjs";
import { runLifecycleSmoke, runProfileCommands } from "../src/docker-runner.mjs";
import { validateRunnerProfileFile } from "../src/runner-profile.mjs";

const args = process.argv.slice(2);

if (args[0] === "docker" && args[1] === "check") {
  const options = parseOptions(args.slice(2), { allowProfile: false });
  const result = checkDocker();
  printResult(result, options.json, result.status === "passed" ? "Docker available" : "Docker unavailable", result.status === "passed");
  process.exit(result.status === "passed" ? 0 : 1);
}

if (args[0] === "run" && args.includes("--lifecycle-smoke")) {
  const options = parseOptions(args.slice(1), { allowProfile: true });
  if (!options.profile) usageWithMessage("Missing required --profile <path>");
  const result = runLifecycleSmoke(options.profile, { repoRoot: options.repoRoot });
  printResult(result, options.json, result.status === "passed" ? "Lifecycle smoke passed" : "Lifecycle smoke failed", result.status === "passed");
  process.exit(result.status === "passed" ? 0 : 1);
}

if (args[0] === "run" && args.includes("--commands")) {
  const options = parseOptions(args.slice(1), { allowProfile: true });
  if (!options.profile) usageWithMessage("Missing required --profile <path>");
  const result = runProfileCommands(options.profile, { repoRoot: options.repoRoot });
  printResult(result, options.json, result.status === "passed" ? "Profile commands passed" : "Profile commands failed", result.status === "passed");
  process.exit(result.status === "passed" ? 0 : 1);
}

if (args[0] !== "profile" || args[1] !== "validate") {
  usage(1);
}

const options = parseOptions(args.slice(2), { allowProfile: true });
if (!options.profile) usageWithMessage("Missing required --profile <path>");

const result = validateRunnerProfileFile(options.profile, { repoRoot: options.repoRoot });
printResult(result, options.json, result.valid ? "RunnerProfile valid" : "RunnerProfile invalid", result.valid);
process.exit(result.valid ? 0 : 1);

function parseOptions(tokens, flags) {
  const options = { repoRoot: process.cwd(), json: false };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--profile" && flags.allowProfile) {
      options.profile = tokens[++index];
    } else if (token === "--repo-root") {
      options.repoRoot = tokens[++index];
    } else if (token === "--json") {
      options.json = true;
    } else if (token === "--lifecycle-smoke") {
      options.lifecycleSmoke = true;
    } else if (token === "--commands") {
      options.commands = true;
    } else {
      console.error(`Unknown option: ${token}`);
      usage(1);
    }
  }
  return options;
}

function printResult(result, json, message, success) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const output = success ? console.log : console.error;
  output(message);
  for (const error of result.errors ?? []) console.error(`- ${error}`);
}

function usageWithMessage(message) {
  console.error(message);
  usage(1);
}

function usage(exitCode) {
  console.error("Usage:");
  console.error("  agentproof profile validate --profile <path> [--repo-root <path>] [--json]");
  console.error("  agentproof docker check [--json]");
  console.error("  agentproof run --profile <path> --lifecycle-smoke [--repo-root <path>] [--json]");
  console.error("  agentproof run --profile <path> --commands [--repo-root <path>] [--json]");
  process.exit(exitCode);
}
