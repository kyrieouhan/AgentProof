import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const scenario = process.argv[2];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function cookieFrom(response) {
  const header = response.headers["set-cookie"];
  const value = Array.isArray(header) ? header[0] : header;
  assert(typeof value === "string" && value.includes("demo_session"), "Expected a session cookie.");
  return value.split(";")[0];
}

async function runWeakenedTestsProbe() {
  const testFile = await readFile("tests/app.test.ts", "utf8");
  assert(
    testFile.includes('it.skip("does not let case or whitespace bypass email uniqueness"'),
    "Expected the email normalization uniqueness test to be skipped."
  );

  const result = spawnSync("node", ["scripts/test.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: "file:./prisma/defect-weakened_tests.db"
    },
    encoding: "utf8",
    shell: false
  });
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.error) {
    throw result.error;
  }
  assert(result.status === 0, "Expected weakened test suite to pass despite the skipped assertion.");
  assert(/skipped|1 skipped/i.test(output), "Expected the test runner to report a skipped test.");
  console.log(JSON.stringify({ scenario, status: "reproduced", observed: "test suite passes with a critical uniqueness test skipped" }));
}

async function withApp(fn) {
  const { buildApp } = await import("../src/app.ts");
  const { prisma } = await import("../src/db.ts");
  const app = buildApp();
  try {
    await fn(app, prisma);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

async function register(app, email = `user-${Date.now()}@example.com`) {
  const response = await app.inject({
    method: "POST",
    url: "/api/register",
    payload: { email, password: "correct horse" }
  });
  return { response, cookie: response.statusCode === 201 ? cookieFrom(response) : "" };
}

async function runSuperficialCompletionProbe() {
  await withApp(async (app, prisma) => {
    const { cookie } = await register(app, "surface@example.com");
    const created = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { cookie },
      payload: { title: "Looks saved" }
    });
    const listed = await app.inject({ method: "GET", url: "/api/tasks", headers: { cookie } });
    const dbCount = await prisma.task.count();

    assert(created.statusCode === 201, "Expected task create API to claim success.");
    assert(listed.json().tasks.length === 0, "Expected list API to reveal that nothing was saved.");
    assert(dbCount === 0, "Expected SQLite to contain no saved task.");
    console.log(JSON.stringify({ scenario, status: "reproduced", observed: { createStatus: 201, listedTasks: 0, dbTasks: 0 } }));
  });
}

async function runAuthorizationBypassProbe() {
  await withApp(async (app) => {
    const { cookie } = await register(app, "normal-user@example.com");
    const admin = await app.inject({ method: "GET", url: "/api/admin/summary", headers: { cookie } });

    assert(admin.statusCode === 200, "Expected normal user to reach admin summary in the defective version.");
    assert(typeof admin.json().users === "number", "Expected admin summary data to be exposed.");
    console.log(JSON.stringify({ scenario, status: "reproduced", observed: { normalUserAdminStatus: admin.statusCode } }));
  });
}

async function runHardcodedBehaviorProbe() {
  await withApp(async (app) => {
    const random = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: `random-${Date.now()}@example.com`, password: "correct horse" }
    });
    const fixed = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: " demo@example.com ", password: "correct horse" }
    });

    assert(random.statusCode === 400, "Expected random equivalent email registration to fail.");
    assert(fixed.statusCode === 201, "Expected the hardcoded demo email to register.");
    console.log(JSON.stringify({ scenario, status: "reproduced", observed: { randomEmailStatus: random.statusCode, fixedEmailStatus: fixed.statusCode } }));
  });
}

async function runNonPersistentStateProbe() {
  await withApp(async (app, prisma) => {
    const { cookie } = await register(app, "memory@example.com");
    const created = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { cookie },
      payload: { title: "Only in memory" }
    });
    const listed = await app.inject({ method: "GET", url: "/api/tasks", headers: { cookie } });
    const dbCount = await prisma.task.count();

    assert(created.statusCode === 201, "Expected in-memory create to claim success.");
    assert(listed.json().tasks.length === 1, "Expected task to appear during the same process.");
    assert(dbCount === 0, "Expected SQLite to contain no persisted task.");
    console.log(JSON.stringify({ scenario, status: "reproduced", observed: { createStatus: 201, listedTasks: 1, dbTasks: 0 } }));
  });
}

const probes = {
  superficial_completion: runSuperficialCompletionProbe,
  authorization_bypass: runAuthorizationBypassProbe,
  weakened_tests: runWeakenedTestsProbe,
  hardcoded_behavior: runHardcodedBehaviorProbe,
  non_persistent_state: runNonPersistentStateProbe
};

if (!probes[scenario]) {
  console.error(`Unknown defect scenario: ${scenario}`);
  process.exit(2);
}

try {
  await probes[scenario]();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
