import assert from "node:assert/strict";
import test from "node:test";
import { DOMAIN_SCHEMA_VERSION } from "../src/domain/schemas.mjs";
import { createSeededRng, demoRegistrationData, seedRecord } from "../src/domain/test-data.mjs";

test("seeded RNG is deterministic for the same seed", () => {
  const first = createSeededRng("m2-seed-1");
  const second = createSeededRng("m2-seed-1");

  assert.deepEqual(
    [first.int(1, 100), first.token(8), first.int(1, 100)],
    [second.int(1, 100), second.token(8), second.int(1, 100)]
  );
});

test("different seeds produce different demo registration data", () => {
  const first = demoRegistrationData("seed-a");
  const second = demoRegistrationData("seed-b");

  assert.notEqual(first.values.email, second.values.email);
  assert.match(first.values.email, /^vericrate\+[a-z0-9]{10}@example\.test$/);
  assert.equal(first.purpose, "demo-registration");
});

test("seed records preserve the seed alongside generated values", () => {
  const record = seedRecord("fixed-seed", "api-register", { email: "vericrate@example.test" });

  assert.equal(record.schema_version, DOMAIN_SCHEMA_VERSION);
  assert.equal(record.seed, "fixed-seed");
  assert.deepEqual(record.values, { email: "vericrate@example.test" });
});
