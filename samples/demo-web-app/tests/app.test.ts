import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sessionCookieName } from "../src/auth";
import { buildApp } from "../src/app";
import { prisma } from "../src/db";
import { verifyPassword } from "../src/password";

function cookieFrom(response: { headers: Record<string, number | string | string[] | undefined> }): string {
  const setCookie = response.headers["set-cookie"];
  const header = Array.isArray(setCookie) ? setCookie[0] : typeof setCookie === "string" ? setCookie : undefined;
  expect(header).toContain(sessionCookieName);
  return header?.split(";")[0] ?? "";
}

describe("official demo correct baseline", () => {
  const app = buildApp();

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("registers a normalized user and creates a valid session", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "  Person@Example.COM ", password: "correct horse" }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().user.email).toBe("person@example.com");

    const cookie = cookieFrom(response);
    const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe("person@example.com");
  });

  it("rejects duplicate email registration", async () => {
    await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "dupe@example.com", password: "correct horse" }
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "dupe@example.com", password: "correct horse" }
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error).toContain("already registered");
  });

  it("does not let case or whitespace bypass email uniqueness", async () => {
    await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "  Mixed@Example.com ", password: "correct horse" }
    });
    const duplicate = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "mixed@example.COM", password: "correct horse" }
    });

    expect(duplicate.statusCode).toBe(409);
  });

  it("does not store the password as plaintext", async () => {
    await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "hash@example.com", password: "correct horse" }
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "hash@example.com" } });
    expect(user.passwordHash).not.toBe("correct horse");
    expect(user.passwordHash).not.toContain("correct horse");
    await expect(verifyPassword("correct horse", user.passwordHash)).resolves.toBe(true);
  });

  it("logs in with the correct password and rejects the wrong password", async () => {
    await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "login@example.com", password: "correct horse" }
    });

    const rejected = await app.inject({
      method: "POST",
      url: "/api/login",
      payload: { email: "login@example.com", password: "wrong password" }
    });
    expect(rejected.statusCode).toBe(401);
    expect(rejected.json().error).toContain("Invalid email or password");

    const accepted = await app.inject({
      method: "POST",
      url: "/api/login",
      payload: { email: " LOGIN@example.com ", password: "correct horse" }
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().user.email).toBe("login@example.com");
    cookieFrom(accepted);
  });

  it("rejects normal users from admin API and admin page on the server", async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "user@example.com", password: "correct horse" }
    });
    const cookie = cookieFrom(registered);

    const api = await app.inject({ method: "GET", url: "/api/admin/summary", headers: { cookie } });
    const page = await app.inject({ method: "GET", url: "/admin", headers: { cookie } });

    expect(api.statusCode).toBe(403);
    expect(page.statusCode).toBe(403);
  });

  it("persists business data so it can be read back", async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "tasks@example.com", password: "correct horse" }
    });
    const cookie = cookieFrom(registered);

    const created = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { cookie },
      payload: { title: "Write evidence matrix" }
    });
    expect(created.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/api/tasks", headers: { cookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json().tasks).toHaveLength(1);
    expect(list.json().tasks[0].title).toBe("Write evidence matrix");

    const stored = await prisma.task.findFirstOrThrow({ where: { title: "Write evidence matrix" } });
    expect(stored.title).toBe("Write evidence matrix");
  });

  it("returns clear errors for invalid input", async () => {
    const invalidEmail = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "not-an-email", password: "correct horse" }
    });
    expect(invalidEmail.statusCode).toBe(400);
    expect(invalidEmail.json().error).toContain("valid email");

    const registered = await app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "input@example.com", password: "correct horse" }
    });
    const cookie = cookieFrom(registered);
    const invalidTask = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: { cookie },
      payload: { title: " " }
    });
    expect(invalidTask.statusCode).toBe(400);
    expect(invalidTask.json().error).toContain("Task title");
  });
});
