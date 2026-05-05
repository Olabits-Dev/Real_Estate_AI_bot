"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";
import { normalizeDomain } from "@/lib/domain";
import { getPlanAccess } from "@/lib/plans";
import { generatePublicKey } from "@/lib/public-key";
import { getPrismaClient } from "@/lib/prisma";

const personalityToPrompt = {
  FRIENDLY:
    "Warm, conversational, and helpful. Keep answers simple and reassuring.",
  LUXURY_FOCUSED:
    "Elegant, premium, and consultative. Emphasize exclusivity and high-value features.",
  DIRECT:
    "Concise, professional, and action-oriented. Focus on facts and quick next steps.",
} as const;
const ACTIVE_COMPANY_COOKIE = "dashboard_active_company_id";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateCompanyProfile(formData: FormData) {
  const prisma = getPrismaClient();
  const companyId = getFormValue(formData, "companyId");
  const name = getFormValue(formData, "name");
  const whatsappNum = getFormValue(formData, "whatsappNum");
  const primaryLocation = getFormValue(formData, "primaryLocation");
  const authorizedDomain = normalizeDomain(getFormValue(formData, "authorizedDomain"));
  const billingEmailRaw = getFormValue(formData, "billingEmail").toLowerCase();
  const aiPersonality = getFormValue(formData, "aiPersonality");

  if (
    !companyId ||
    !name ||
    !whatsappNum ||
    !primaryLocation ||
    !authorizedDomain ||
    !aiPersonality
  ) {
    throw new Error("All profile fields are required.");
  }

  if (billingEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmailRaw)) {
    throw new Error("Billing email is invalid.");
  }

  const personalityKey =
    aiPersonality in personalityToPrompt
      ? (aiPersonality as keyof typeof personalityToPrompt)
      : "FRIENDLY";

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      whatsappNum,
      primaryLocation,
      authorizedDomain,
      billingEmail: billingEmailRaw || null,
      aiPersonality: personalityKey,
      systemPrompt: personalityToPrompt[personalityKey],
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/integration");
  revalidatePath("/dashboard/billing");
  revalidatePath("/preview/[companyId]", "page");
  revalidatePath("/dashboard/preview/[companyId]", "page");
}

export async function createProperty(formData: FormData) {
  const prisma = getPrismaClient();
  const session = await getCurrentSession();
  const companyId = getFormValue(formData, "companyId");
  const title = getFormValue(formData, "title");
  const location = getFormValue(formData, "location");
  const description = getFormValue(formData, "description");
  const documentType = getFormValue(formData, "documentType");
  const priceValue = Number(getFormValue(formData, "price"));

  if (
    !companyId ||
    !title ||
    !location ||
    !description ||
    !documentType ||
    Number.isNaN(priceValue)
  ) {
    throw new Error("All property fields are required.");
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  });
  if (!company) {
    throw new Error("Company not found.");
  }

  const access = getPlanAccess(company.plan);
  const developerOverride = session?.user.role === "DEVELOPER";
  if (!access.properties && !developerOverride) {
    throw new Error("Your current plan does not allow property management.");
  }

  await prisma.property.create({
    data: {
      companyId,
      title,
      location,
      description,
      price: priceValue,
      propertyType: documentType,
      isAvailable: true,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard/billing");
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

export async function createCompany(formData: FormData) {
  const prisma = getPrismaClient();
  const name = getFormValue(formData, "name");
  const whatsappNum = getFormValue(formData, "whatsappNum");
  const primaryLocation = getFormValue(formData, "primaryLocation");
  const authorizedDomain = normalizeDomain(getFormValue(formData, "authorizedDomain"));
  const aiPersonality = getFormValue(formData, "aiPersonality");

  if (!name || !whatsappNum || !primaryLocation || !authorizedDomain || !aiPersonality) {
    throw new Error("All company onboarding fields are required.");
  }

  const personalityKey =
    aiPersonality in personalityToPrompt
      ? (aiPersonality as keyof typeof personalityToPrompt)
      : "FRIENDLY";

  const baseSlug = slugify(name) || "company";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const created = await prisma.company.create({
    data: {
      name,
      slug,
      apiKey: randomApiKey(),
      publicKey: generatePublicKey(),
      systemPrompt: personalityToPrompt[personalityKey],
      primaryLocation,
      aiPersonality: personalityKey,
      whatsappNum,
      authorizedDomain,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, created.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard/integration");
  revalidatePath("/dashboard/billing");
}

export async function switchDashboardCompany(formData: FormData) {
  const companyId = getFormValue(formData, "companyId");
  if (!companyId) {
    throw new Error("companyId is required.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard/integration");
  revalidatePath("/dashboard/billing");
}

export async function updateCompanyById(formData: FormData) {
  const prisma = getPrismaClient();
  const companyId = getFormValue(formData, "companyId");
  const name = getFormValue(formData, "name");
  const whatsappNum = getFormValue(formData, "whatsappNum");
  const primaryLocation = getFormValue(formData, "primaryLocation");
  const authorizedDomain = normalizeDomain(getFormValue(formData, "authorizedDomain"));
  const aiPersonality = getFormValue(formData, "aiPersonality");

  if (
    !companyId ||
    !name ||
    !whatsappNum ||
    !primaryLocation ||
    !authorizedDomain ||
    !aiPersonality
  ) {
    throw new Error("All company fields are required.");
  }

  const personalityKey =
    aiPersonality in personalityToPrompt
      ? (aiPersonality as keyof typeof personalityToPrompt)
      : "FRIENDLY";

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      whatsappNum,
      primaryLocation,
      authorizedDomain,
      aiPersonality: personalityKey,
      systemPrompt: personalityToPrompt[personalityKey],
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard/integration");
  revalidatePath("/dashboard/billing");
}

export async function deleteCompany(formData: FormData) {
  const prisma = getPrismaClient();
  const companyId = getFormValue(formData, "companyId");
  const confirmName = getFormValue(formData, "confirmName");

  if (!companyId || !confirmName) {
    throw new Error("companyId and confirmation name are required.");
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error("Company not found.");
  }

  if (confirmName !== company.name) {
    throw new Error("Confirmation name does not match company name.");
  }

  const cookieStore = await cookies();
  const activeCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  await prisma.company.delete({
    where: { id: companyId },
  });

  if (activeCompanyId === companyId) {
    const nextCompany = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (nextCompany) {
      cookieStore.set(ACTIVE_COMPANY_COOKIE, nextCompany.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    } else {
      cookieStore.delete(ACTIVE_COMPANY_COOKIE);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard/integration");
  revalidatePath("/dashboard/billing");
}
