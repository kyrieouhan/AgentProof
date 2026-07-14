import assert from "node:assert/strict";
import test from "node:test";
import { createCounter } from "../src/counter.mjs";

test("increments from zero", () => {
  const counter = createCounter();
  assert.equal(counter.increment(), 1);
  assert.equal(counter.increment(), 2);
});

test("honors numeric initial state", () => {
  assert.equal(createCounter(4).value(), 4);
});
