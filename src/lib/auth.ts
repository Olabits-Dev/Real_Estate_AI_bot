import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma, UserRole } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";

const SESSION_COOKIE = "olabits_session";
const SESSION_TTL_DAYS = 30;
type SessionWithUser = Prisma.UserSessionGetPayload<{
  include: {
    user: {
      include: {
        memberships: {
          include: {
            company: true;
          };
        };
      };
    };
  };
}>;

function hashWithSalt(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = hashWithSalt(password, salt);
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, digest] = storedHash.split(":");
  if (!salt || !digest) return false;
  const derived = hashWithSalt(password, salt);
  const expected = Buffer.from(digest, "hex");
  const received = Buffer.from(derived, "hex");
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function expiresAtFromNow() {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_TTL_DAYS);
  return date;
}

export async function createSession(userId: string) {
  const prisma = getPrismaClient();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = expiresAtFromNow();

  await prisma.userSession.create({
    data: { token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const prisma = getPrismaClient();
    try {
      await prisma.userSession.deleteMany({
        where: { token },
      });
    } catch (error) {
      console.error("Session cleanup failed:", error);
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const prisma = getPrismaClient();

  let session: SessionWithUser | null = null;
  try {
    session = await prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Session lookup failed:", error);
    return null;
  }

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    try {
      await prisma.userSession.delete({ where: { id: session.id } });
    } catch (error) {
      console.error("Expired session cleanup failed:", error);
    }
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return session;
}

export async function requireRole(role: UserRole) {
  const session = await getCurrentSession();
  if (!session || session.user.role !== role) {
    redirect(role === "DEVELOPER" ? "/developer/login" : "/login");
  }
  return session.user;
}

export async function requireAuthenticatedUser() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session.user;
}
