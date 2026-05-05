"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardCompany } from "@/lib/company-context";
import { normalizeDomain } from "@/lib/domain";
import { getPlanAccess } from "@/lib/plans";
import {
  acquireSyncLock,
  extractPropertiesFromPayload,
  finishSyncFailure,
  finishSyncSuccess,
  runPropertySync,
} from "@/lib/property-sync";
import { generatePublicKey } from "@/lib/public-key";
import { generateDataSourceApiKey } from "@/lib/source-key";
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

function revalidateDashboardData() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/listings");
  revalidatePath("/dashboard/integration");
  revalidatePath("/dashboard/billing");
}

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
      dataSourceApiKey: generateDataSourceApiKey(),
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

function normalizeEndpointUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export async function updateCompanyDataSource(formData: FormData) {
  const prisma = getPrismaClient();
  const company = await getDashboardCompany();
  if (!company) {
    redirect("/dashboard/integration?sync=missing_company");
  }

  const endpointRaw = getFormValue(formData, "dataSourceEndpoint");
  const endpoint = normalizeEndpointUrl(endpointRaw);

  if (endpointRaw && !endpoint) {
    redirect("/dashboard/integration?sync=invalid_endpoint");
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      dataSourceEndpoint: endpoint || null,
      dataSourceLastSyncMessage: endpoint
        ? "Data source endpoint updated."
        : "Data source endpoint cleared.",
    },
  });

  revalidateDashboardData();
  redirect(
    `/dashboard/integration?sync=${endpoint ? "config_saved" : "config_cleared"}`,
  );
}

export async function rotateCompanyDataSourceKey() {
  const prisma = getPrismaClient();
  const company = await getDashboardCompany();
  if (!company) {
    redirect("/dashboard/integration?sync=missing_company");
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      dataSourceApiKey: generateDataSourceApiKey(),
      dataSourceLastSyncMessage: "Data source API key rotated.",
    },
  });

  revalidateDashboardData();
  redirect("/dashboard/integration?sync=key_rotated");
}

function readPropertiesFromPayload(payload: unknown) {
  return extractPropertiesFromPayload(payload);
}

export async function syncPropertiesNow() {
  const company = await getDashboardCompany();
  if (!company) {
    redirect("/dashboard/integration?sync=missing_company");
  }

  if (!company.dataSourceEndpoint) {
    redirect("/dashboard/integration?sync=missing_endpoint");
  }

  const lockAcquired = await acquireSyncLock(company.id);
  if (!lockAcquired) {
    redirect("/dashboard/integration?sync=in_progress");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    const response = await fetch(company.dataSourceEndpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-client-source-key": company.dataSourceApiKey,
        Authorization: `Bearer ${company.dataSourceApiKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`Source endpoint request failed (${response.status}).`);
    }

    const payload = (await response.json()) as unknown;
    const properties = readPropertiesFromPayload(payload);
    const result = await runPropertySync({
      companyId: company.id,
      properties,
      replaceExisting: true,
    });

    await finishSyncSuccess(
      company.id,
      result.processed,
      `Sync successful: ${result.processed} listing(s) processed.`,
    );

    revalidateDashboardData();
    redirect(`/dashboard/integration?sync=success&count=${result.processed}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    await finishSyncFailure(company.id, message);
    revalidateDashboardData();
    redirect("/dashboard/integration?sync=failed");
  }
}
