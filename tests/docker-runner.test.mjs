import assert from "node:assert/strict";
import test from "node:test";
import { runLifecycleSmoke, runProfileCommands } from "../src/docker-runner.mjs";

test("lifecycle smoke builds a locked-down docker command with a fake runner", () => {
  const result = runLifecycleSmoke("samples/demo-web-app/vericrate.runner-profile.json", {
    repoRoot: ".",
    run: (command, args) => {
      if (args[0] === "--version") return { exitCode: 0, stdout: "Docker version 29.0.0\n", stderr: "" };
      if (args[0] === "info") return { exitCode: 0, stdout: "\"29.0.0\"\n", stderr: "" };
      return { exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(result.status, "passed");
  assert.equal(result.cleanup, "removed");
  assert.equal(result.commands.at(-1).command.includes("--network"), true);
  assert.equal(result.commands.at(-1).command.includes("none"), true);
  assert.equal(result.commands.at(-1).command.includes("--cap-drop"), true);
  assert.equal(result.commands.at(-1).command.includes("ALL"), true);
  assert.match(result.commands.at(-1).command.at(-1), /id -u/);
  assert.match(result.commands.at(-1).command.at(-1), /vericrate-write-test/);
});

test("profile command run records install, build and test phases", () => {
  const result = runProfileCommands("samples/demo-web-app/vericrate.runner-profile.json", {
    repoRoot: ".",
    run: (_command, args) => {
      if (args[0] === "--version") return { exitCode: 0, stdout: "Docker version 29.0.0\n", stderr: "" };
      if (args[0] === "info") return { exitCode: 0, stdout: "\"29.0.0\"\n", stderr: "" };
      return { exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.commands.filter(command => command.phase).map(command => command.phase), ["install", "build", "test"]);
  assert.equal(result.commands.find(command => command.phase === "install").command.includes("bridge"), true);
  assert.equal(result.commands.find(command => command.phase === "install").command.includes("2048m"), true);
  assert.equal(result.commands.find(command => command.phase === "test").command.includes("none"), true);
});

test("profile command can fall back to a local image id when tag inspect is unavailable", () => {
  const result = runProfileCommands("samples/demo-web-app/vericrate.runner-profile.json", {
    repoRoot: ".",
    run: (_command, args) => {
      if (args[0] === "--version") return { exitCode: 0, stdout: "Docker version 29.0.0\n", stderr: "" };
      if (args[0] === "info") return { exitCode: 0, stdout: "\"29.0.0\"\n", stderr: "" };
      if (args[0] === "image" && args[1] === "inspect") return { exitCode: 1, stdout: "", stderr: "No such image\n" };
      if (args[0] === "image" && args[1] === "ls") return { exitCode: 0, stdout: "node:20-bookworm local-node-image-id\n", stderr: "" };
      if (args[0] === "pull") throw new Error("Runner should not pull when local tag is listed.");
      return { exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(result.status, "passed");
  assert.equal(result.commands.some(command => command.command.includes("pull")), false);
  assert.equal(result.commands.find(command => command.phase === "install").command.includes("local-node-image-id"), true);
});


test("timed out profile command is classified and force-cleans the container", () => {
  const result = runProfileCommands("samples/demo-web-app/vericrate.runner-profile.json", {
    repoRoot: ".",
    run: (_command, args) => {
      if (args[0] === "--version") return { exitCode: 0, stdout: "Docker version 29.0.0\n", stderr: "" };
      if (args[0] === "info") return { exitCode: 0, stdout: "\"29.0.0\"\n", stderr: "" };
      if (args[0] === "run") return { exitCode: 1, stdout: "", stderr: "", errorCode: "ETIMEDOUT" };
      if (args[0] === "rm") return { exitCode: 0, stdout: "removed\n", stderr: "" };
      return { exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(result.status, "timeout");
  assert.deepEqual(result.errors, ["install command timed out"]);
  const install = result.commands.find(command => command.phase === "install");
  assert.equal(install.timedOut, true);
  assert.deepEqual(install.containerCleanup.command.slice(1, 4), ["rm", "-f", install.command[install.command.indexOf("--name") + 1]]);
  assert.equal(install.containerCleanup.exitCode, 0);
  assert.equal(result.cleanup, "removed");
});

test("cancelled profile command is classified and force-cleans the container", () => {
  const result = runProfileCommands("samples/demo-web-app/vericrate.runner-profile.json", {
    repoRoot: ".",
    run: (_command, args) => {
      if (args[0] === "--version") return { exitCode: 0, stdout: "Docker version 29.0.0\n", stderr: "" };
      if (args[0] === "info") return { exitCode: 0, stdout: "\"29.0.0\"\n", stderr: "" };
      if (args[0] === "run") return { exitCode: 1, stdout: "", stderr: "", cancelled: true };
      if (args[0] === "rm") return { exitCode: 0, stdout: "removed\n", stderr: "" };
      return { exitCode: 0, stdout: "", stderr: "" };
    }
  });
  assert.equal(result.status, "cancelled");
  assert.deepEqual(result.errors, ["install command cancelled"]);
  const install = result.commands.find(command => command.phase === "install");
  assert.equal(install.cancelled, true);
  assert.equal(install.containerCleanup.command.includes("rm"), true);
  assert.equal(result.cleanup, "removed");
});
