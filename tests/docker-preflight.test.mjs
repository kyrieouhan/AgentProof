import assert from "node:assert/strict";
import test from "node:test";
import { checkDocker } from "../src/docker-preflight.mjs";

test("reports infrastructure_error when docker CLI is missing", () => {
  const result = checkDocker({
    run: () => ({ exitCode: 1, stdout: "", stderr: "", errorCode: "ENOENT" })
  });
  assert.equal(result.status, "infrastructure_error");
  assert.equal(result.dockerAvailable, false);
  assert.match(result.errors.join("\n"), /not found/);
});

test("reports infrastructure_error when docker engine is unavailable", () => {
  const result = checkDocker({
    run: (_command, args) => {
      if (args[0] === "--version") return { exitCode: 0, stdout: "Docker version 27.0.0\n", stderr: "" };
      return { exitCode: 1, stdout: "", stderr: "Cannot connect to the Docker daemon" };
    }
  });
  assert.equal(result.status, "infrastructure_error");
  assert.equal(result.dockerAvailable, true);
  assert.equal(result.engineAvailable, false);
});

test("passes when docker CLI and engine respond", () => {
  const result = checkDocker({
    run: (_command, args) => {
      if (args[0] === "--version") return { exitCode: 0, stdout: "Docker version 27.0.0\n", stderr: "" };
      return { exitCode: 0, stdout: "\"27.0.0\"\n", stderr: "" };
    }
  });
  assert.equal(result.status, "passed");
  assert.equal(result.dockerAvailable, true);
  assert.equal(result.engineAvailable, true);
  assert.equal(result.dockerCommand, "docker");
  assert.equal(result.serverVersion, "27.0.0");
});
