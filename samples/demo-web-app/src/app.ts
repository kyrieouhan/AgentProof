import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { createSession, destroySession, getCurrentUser, requireAdmin, requireUser, toPublicUser } from "./auth";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./password";

const staticDir = resolve(__dirname, "../static");

type ObjectBody = Record<string, unknown>;

function asObject(value: unknown): ObjectBody {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ObjectBody) : {};
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function cleanPassword(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 8) {
    return null;
  }
  return value;
}

function cleanTitle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const title = value.trim();
  return title.length > 0 && title.length <= 120 ? title : null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function buildApp() {
  const app = Fastify({ logger: false });
  void app.register(cookie);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({ error: "Unexpected server error." });
  });

  app.get("/", async (_request, reply) => {
    reply.type("text/html").send(await readFile(resolve(staticDir, "index.html"), "utf8"));
  });

  app.get("/styles.css", async (_request, reply) => {
    reply.type("text/css").send(await readFile(resolve(staticDir, "styles.css"), "utf8"));
  });

  app.get("/app.js", async (_request, reply) => {
    reply.type("application/javascript").send(await readFile(resolve(staticDir, "app.js"), "utf8"));
  });

  app.get("/health", async () => ({ ok: true }));

  app.get("/admin", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) {
      return reply;
    }
    return reply.type("text/html").send("<h1>Admin console</h1><p>Admin-only page.</p>");
  });

  app.get("/api/me", async (request) => {
    const user = await getCurrentUser(request);
    return { user };
  });

  app.post("/api/register", async (request, reply) => {
    const body = asObject(request.body);
    const email = normalizeEmail(body.email);
    const password = cleanPassword(body.password);
    if (!email) {
      return reply.code(400).send({ error: "A valid email is required." });
    }
    if (!password) {
      return reply.code(400).send({ error: "Password must be at least 8 characters." });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Email is already registered." });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password)
      }
    });
    await createSession(reply, user.id);
    return reply.code(201).send({ user: toPublicUser(user) });
  });

  app.post("/api/login", async (request, reply) => {
    const body = asObject(request.body);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : null;
    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: "Invalid email or password." });
    }
    await createSession(reply, user.id);
    return { user: toPublicUser(user) };
  });

  app.post("/api/logout", async (request, reply) => {
    await destroySession(request, reply);
    return { ok: true };
  });

  app.get("/api/admin/summary", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) {
      return reply;
    }
    const [users, tasks] = await Promise.all([prisma.user.count(), prisma.task.count()]);
    return { users, tasks };
  });

  app.get("/api/tasks", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return reply;
    }
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { id: "asc" }
    });
    return { tasks };
  });

  app.post("/api/tasks", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return reply;
    }
    const title = cleanTitle(asObject(request.body).title);
    if (!title) {
      return reply.code(400).send({ error: "Task title is required." });
    }
    const task = await prisma.task.create({
      data: {
        title,
        userId: user.id
      }
    });
    return reply.code(201).send({ task });
  });

  app.patch("/api/tasks/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return reply;
    }
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(400).send({ error: "Valid task id is required." });
    }
    const body = asObject(request.body);
    const data: { title?: string; completed?: boolean } = {};
    if ("title" in body) {
      const title = cleanTitle(body.title);
      if (!title) {
        return reply.code(400).send({ error: "Task title is required." });
      }
      data.title = title;
    }
    if ("completed" in body) {
      if (!isBoolean(body.completed)) {
        return reply.code(400).send({ error: "Task completed must be boolean." });
      }
      data.completed = body.completed;
    }
    const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return reply.code(404).send({ error: "Task not found." });
    }
    const task = await prisma.task.update({ where: { id }, data });
    return { task };
  });

  return app;
}
