import assert from "node:assert/strict";
import test from "node:test";
import { greeting } from "../src/app.mjs";

test("normalizes greeting input", () => {
  assert.equal(greeting("  Codex  "), "hello, codex");
});

test("uses a stable default", () => {
  assert.equal(greeting(""), "hello, agent");
});
