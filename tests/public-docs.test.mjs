import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("public status documents no longer claim the project is currently in M0", () => {
  for (const file of ["AGENTS.md", "docs/execution-status.md", "README.md"]) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(text.includes("当前处于 M0"), false, `${file} still says 当前处于 M0`);
  }
});
