"use server";

import { getPrismaClient } from "@/lib/prisma";
import { scrapeWebsite } from "@/lib/scraper";
import { sendIntegrationSnippetEmail } from "@/lib/mailer";
import { getRuntimeAppBaseUrl } from "@/lib/app-url";
import { generatePublicKey } from "@/lib/public-key";
import { requireRole } from "@/lib/auth";
import type { EmailState, OnboardingState } from "@/app/onboarding/state";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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

function getHostname(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function normalizeColor(color: string) {
  const value = color.trim();
  const isValid =
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ||
    /^rgb(a)?\(.+\)$/.test(value) ||
    /^hsl(a)?\(.+\)$/.test(value);
  return isValid ? value : "#2563eb";
}

export async function scrapeAndConfigure(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  await requireRole("DEVELOPER");
  const prisma = getPrismaClient();
  const websiteInput = getFormValue(formData, "websiteUrl");

  if (!websiteInput) {
    return {
      status: "error",
      message: "Please enter a valid website URL.",
      preview: null,
    };
  }

  try {
    const scraped = await scrapeWebsite(websiteInput);
    const baseSlug = slugify(scraped.companyName) || "company";
    let slug = baseSlug;
    let suffix = 1;

    while (await prisma.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const companyApiKey = randomApiKey();
    const companyPublicKey = generatePublicKey();
    const hostname = getHostname(scraped.websiteUrl);
    const promptFromBrand = `You are an onboarding preview assistant for ${scraped.companyName}.
Brand vibe from website description: ${scraped.siteDescription}
Speak in a way that matches this vibe while remaining professional and conversion-focused.`;

    const company = await prisma.company.create({
      data: {
        name: scraped.companyName,
        slug,
        apiKey: companyApiKey,
        publicKey: companyPublicKey,
        systemPrompt: promptFromBrand,
        primaryLocation: "Lagos",
        aiPersonality: "FRIENDLY",
        whatsappNum: process.env.DEFAULT_ONBOARDING_WHATSAPP ?? "2340000000000",
        authorizedDomain: hostname,
      },
    });

    if (scraped.sampleProperties.length) {
      await prisma.property.createMany({
        data: scraped.sampleProperties.map((property) => ({
          companyId: company.id,
          title: property.title,
          location: "Lagos",
          price: 0,
          propertyType: "Listing",
          description: `Imported from ${property.url}`,
          isAvailable: true,
        })),
      });
    }

    const snippet = `<script src="${await getRuntimeAppBaseUrl()}/widget.js" data-public-key="${companyPublicKey}" defer></script>`;

    return {
      status: "success",
      message: "Configuration ready. Your live demo is below.",
      preview: {
        companyId: company.id,
        companyName: company.name,
        websiteUrl: scraped.websiteUrl,
        primaryColor: normalizeColor(scraped.primaryColor),
        logoUrl: scraped.logoUrl,
        companyPublicKey,
        snippet,
        isSubscribed: company.isSubscribed,
        plan: company.plan,
        sampleProperties: scraped.sampleProperties,
      },
    };
  } catch (error) {
    console.error("Onboarding scrape error:", error);
    return {
      status: "error",
      message:
        "We could not learn from that website URL right now. Please check the URL and try again.",
      preview: null,
    };
  }
}

export async function emailSnippetToDeveloper(
  _prevState: EmailState,
  formData: FormData,
): Promise<EmailState> {
  await requireRole("DEVELOPER");
  const developerEmail = getFormValue(formData, "developerEmail");
  const companyName = getFormValue(formData, "companyName");
  const snippet = getFormValue(formData, "snippet");

  if (!developerEmail || !snippet || !companyName) {
    return {
      status: "error",
      message: "Missing developer email or integration snippet.",
    };
  }

  try {
    await sendIntegrationSnippetEmail({
      to: developerEmail,
      companyName,
      snippet,
    });

    return {
      status: "success",
      message: "Integration snippet sent to your developer.",
    };
  } catch (error) {
    console.error("Send snippet email error:", error);
    return {
      status: "error",
      message:
        "Email delivery failed. Configure SMTP credentials or copy the snippet manually.",
    };
  }
}
