import { readFile } from "node:fs/promises";
import { buildApp } from "../src/app";
import { prisma } from "../src/db";

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

const app = buildApp();

try {
  const testFile = await readFile("tests/app.test.ts", "utf8");
  const criticalTestSkipped = testFile.includes('it.skip("does not let case or whitespace bypass email uniqueness"');
  const email = `baseline-${Date.now()}@example.com`;

  const registered = await app.inject({
    method: "POST",
    url: "/api/register",
    payload: { email: ` ${email.toUpperCase()} `, password: "correct horse" }
  });
  assert(registered.statusCode === 201, "Expected baseline registration to succeed.");
  const cookie = cookieFrom(registered);

  const created = await app.inject({
    method: "POST",
    url: "/api/tasks",
    headers: { cookie },
    payload: { title: "M0 feasibility task" }
  });
  assert(created.statusCode === 201, "Expected baseline task creation to succeed.");

  const listed = await app.inject({ method: "GET", url: "/api/tasks", headers: { cookie } });
  const admin = await app.inject({ method: "GET", url: "/api/admin/summary", headers: { cookie } });
  const dbTasks = await prisma.task.count();

  assert(listed.json().tasks.length === 1, "Expected baseline task list to contain the created task.");
  assert(dbTasks === 1, "Expected baseline SQLite database to contain the created task.");
  assert(admin.statusCode === 403, "Expected baseline normal user to be rejected from admin API.");
  assert(!criticalTestSkipped, "Expected critical uniqueness test to be active in baseline.");

  console.log(
    JSON.stringify({
      scenario: "correct_baseline",
      status: "passed",
      observed: {
        registrationStatus: registered.statusCode,
        normalizedEmail: registered.json().user.email,
        taskCreateStatus: created.statusCode,
        listedTasks: listed.json().tasks.length,
        dbTasks,
        normalUserAdminStatus: admin.statusCode,
        criticalTestSkipped
      }
    })
  );
} finally {
  await app.close();
  await prisma.$disconnect();
}
