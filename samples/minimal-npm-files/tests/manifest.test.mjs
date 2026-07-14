import assert from "node:assert/strict";
import test from "node:test";
import { manifest } from "../src/manifest.mjs";

test("sorts and trims manifest entries", () => {
  assert.deepEqual(manifest([" beta.txt ", "", "alpha.txt"]), ["alpha.txt", "beta.txt"]);
});
