import { DOMAIN_SCHEMA_VERSION, TestDataSeedSchema } from "./schemas.mjs";

export function createSeededRng(seed) {
  let state = hashSeed(seed);
  return {
    next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new Error("invalid integer range");
      return min + Math.floor(this.next() * (max - min + 1));
    },
    token(length = 10) {
      const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
      let output = "";
      for (let index = 0; index < length; index += 1) output += alphabet[this.int(0, alphabet.length - 1)];
      return output;
    }
  };
}

export function demoRegistrationData(seed) {
  const rng = createSeededRng(seed);
  const suffix = rng.token(10);
  return seedRecord(seed, "demo-registration", {
    email: `agentproof+${suffix}@example.test`,
    password: `AP-${rng.token(8)}-Password1!`,
    display_name: `AgentProof ${rng.int(1000, 9999)}`
  });
}

export function seedRecord(seed, purpose, values) {
  return TestDataSeedSchema.parse({
    schema_version: DOMAIN_SCHEMA_VERSION,
    seed,
    purpose,
    values
  });
}

function hashSeed(seed) {
  if (typeof seed !== "string" || seed.trim() === "") throw new Error("seed is required");
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
