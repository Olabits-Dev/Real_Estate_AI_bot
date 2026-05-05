"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import {
  createSession,
  destroySession,
  getCurrentSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { normalizeDomain } from "@/lib/domain";
import { generatePublicKey } from "@/lib/public-key";
import { generateDataSourceApiKey } from "@/lib/source-key";
import { getPrismaClient } from "@/lib/prisma";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isPrismaConnectivityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("getaddrinfo ENOTFOUND") ||
    message.includes("Can't reach database server") ||
    message.includes("P1001")
  );
}

export async function loginSubscriber(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect("/login?error=missing_fields");
  }

  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.role !== "SUBSCRIBER") {
      redirect("/login?error=invalid_credentials");
    }
    if (!verifyPassword(password, user.passwordHash)) {
      redirect("/login?error=invalid_credentials");
    }
    await createSession(user.id);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Subscriber login failed:", error);
    if (
      isPrismaConnectivityError(error) ||
      (typeof error === "object" && error !== null && "clientVersion" in error)
    ) {
      redirect("/login?error=service_unavailable");
    }
    redirect("/login?error=service_unavailable");
  }

  redirect("/dashboard");
}

export async function loginDeveloper(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirect("/developer/login?error=missing_fields");
  }

  try {
    const prisma = getPrismaClient();
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const bootstrapEmail = process.env.DEVELOPER_EMAIL?.trim().toLowerCase();
      const bootstrapPassword = process.env.DEVELOPER_PASSWORD?.trim();
      const bootstrapName = process.env.DEVELOPER_NAME?.trim() ?? "Olabits Developer";
      if (bootstrapEmail === email && bootstrapPassword && bootstrapPassword === password) {
        user = await prisma.user.create({
          data: {
            email,
            fullName: bootstrapName,
            role: "DEVELOPER",
            passwordHash: hashPassword(password),
          },
        });
      }
    }

    if (!user || user.role !== "DEVELOPER") {
      redirect("/developer/login?error=invalid_credentials");
    }
    if (!verifyPassword(password, user.passwordHash)) {
      redirect("/developer/login?error=invalid_credentials");
    }

    await createSession(user.id);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Developer login failed:", error);
    if (
      isPrismaConnectivityError(error) ||
      (typeof error === "object" && error !== null && "clientVersion" in error)
    ) {
      redirect("/developer/login?error=service_unavailable");
    }
    redirect("/developer/login?error=service_unavailable");
  }

  redirect("/developer");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomApiKey() {
  return `rea_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function registerSubscriber(formData: FormData) {
  const prisma = getPrismaClient();
  const fullName = getFormValue(formData, "fullName");
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");
  const companyName = getFormValue(formData, "companyName");
  const whatsappNum = getFormValue(formData, "whatsappNum");
  const primaryLocation = getFormValue(formData, "primaryLocation");
  const authorizedDomain = normalizeDomain(getFormValue(formData, "authorizedDomain"));

  if (
    !fullName ||
    !email ||
    !password ||
    !companyName ||
    !whatsappNum ||
    !primaryLocation ||
    !authorizedDomain
  ) {
    throw new Error("All fields are required.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email is already in use.");
  }

  const baseSlug = slugify(companyName) || "company";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const createdUser = await prisma.user.create({
    data: {
      email,
      fullName,
      role: "SUBSCRIBER",
      passwordHash: hashPassword(password),
    },
  });

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug,
      apiKey: randomApiKey(),
      publicKey: generatePublicKey(),
      dataSourceApiKey: generateDataSourceApiKey(),
      systemPrompt:
        "Warm, conversational, and helpful. Keep answers simple and reassuring.",
      primaryLocation,
      aiPersonality: "FRIENDLY",
      whatsappNum,
      authorizedDomain,
      plan: "SILVER",
      isSubscribed: false,
      billingEmail: email,
    },
  });

  await prisma.companyMember.create({
    data: {
      userId: createdUser.id,
      companyId: company.id,
      role: "OWNER",
    },
  });

  await createSession(createdUser.id);
  redirect("/dashboard");
}

export async function logout() {
  const session = await getCurrentSession();
  await destroySession();
  redirect(session?.user.role === "DEVELOPER" ? "/developer/login" : "/login");
}
