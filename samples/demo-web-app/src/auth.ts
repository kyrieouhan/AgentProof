import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./db";

export const sessionCookieName = "demo_session";
const sessionDays = 7;

export type PublicUser = {
  id: number;
  email: string;
  role: string;
};

export function toPublicUser(user: { id: number; email: string; role: string }): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}

export async function createSession(reply: FastifyReply, userId: number): Promise<void> {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      id,
      userId,
      expiresAt
    }
  });
  reply.setCookie(sessionCookieName, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt
  });
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const sessionId = request.cookies[sessionCookieName];
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  reply.clearCookie(sessionCookieName, { path: "/" });
}

export async function getCurrentUser(request: FastifyRequest): Promise<PublicUser | null> {
  const sessionId = request.cookies[sessionCookieName];
  if (!sessionId) {
    return null;
  }
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true }
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.session.deleteMany({ where: { id: session.id } });
    }
    return null;
  }
  return toPublicUser(session.user);
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<PublicUser | null> {
  const user = await getCurrentUser(request);
  if (!user) {
    reply.code(401).send({ error: "Authentication required." });
    return null;
  }
  return user;
}
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<PublicUser | null> {
  const user = await requireUser(request, reply);
  if (!user) {
    return null;
  }
  if (user.role !== "ADMIN") {
    reply.code(403).send({ error: "Admin access required." });
    return null;
  }
  return user;
}
