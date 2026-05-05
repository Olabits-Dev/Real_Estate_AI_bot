import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import {
  getAvailablePropertiesByCompanyId,
  getCompanyByIdentifier,
} from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { realEstateModel } from "@/lib/ai-config";
import { getPrismaClient } from "@/lib/prisma";
import { toBillingPlan } from "@/lib/billing-plan";
import { extractRequestHost, isAuthorizedDomain } from "@/lib/domain";
import { getPlanAccess, hasAdvancedAnalytics } from "@/lib/plans";

export const maxDuration = 30;

const dbUnavailableMessage =
  "I'm currently unable to access our live listings, but I can answer general questions about the real estate market.";
const genericUnavailableMessage =
  "I'm temporarily unavailable right now. Please try again in a moment.";

type ChatRequestBody = {
  messages: UIMessage[];
  companySlug?: string;
  apiKey?: string;
  publicKey?: string;
  companyId?: string;
  previewPlan?: string;
};

type PropertyForPrompt = {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  propertyType: string;
};

function formatPrice(price: number) {
  return `₦${price.toLocaleString("en-NG")}`;
}

function inventoryToText(properties: PropertyForPrompt[]) {
  if (!properties.length) {
    return "No available properties found in the database right now.";
  }

  return properties
    .map(
      (property) =>
        `- ${property.id}: ${property.title} | ${formatPrice(property.price)} | ${property.location} | ${property.propertyType} | ${property.description}`,
    )
    .join("\n");
}

function toStreamingTextResponse(text: string, status = 200) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: "fallback-message" });
      writer.write({ type: "text-delta", id: "fallback-message", delta: text });
      writer.write({ type: "text-end", id: "fallback-message" });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream, status });
}

function toJsonErrorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

function extractLatestUserMessage(messages: UIMessage[]) {
  return (
    messages
      .filter((message) => message.role === "user")
      .at(-1)
      ?.parts.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim() ?? ""
  );
}

function hasStrongInterest(text: string) {
  return /\b(interested|i like|i want|schedule|book|viewing|view|inspect|tour|buy|purchase|proceed|agent|whatsapp)\b/i.test(
    text,
  );
}

function extractCustomerPhoneFromMessages(messages: UIMessage[]) {
  const text = messages
    .filter((message) => message.role === "user")
    .flatMap((message) =>
      message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text),
    )
    .join(" ");

  const match = text.match(
    /(?:\+?234[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}|0\d{3}[\s-]?\d{3}[\s-]?\d{4}|\+?\d{8,15})/g,
  );
  if (!match?.length) return null;

  const raw = match.at(-1) ?? null;
  return raw?.replace(/[^\d+]/g, "") ?? null;
}

function detectInterestedProperty(
  latestUserMessage: string,
  properties: PropertyForPrompt[],
) {
  const normalized = latestUserMessage.toLowerCase();
  return (
    properties.find(
      (property) =>
        normalized.includes(property.id.toLowerCase()) ||
        normalized.includes(property.title.toLowerCase()),
    ) ?? null
  );
}

function createWhatsappLink(
  whatsappNum: string,
  propertyTitle: string,
  customerPhone: string,
) {
  const message = `Interested in ${propertyTitle}. Customer phone: ${customerPhone}`;
  return `https://wa.me/${whatsappNum}?text=${encodeURIComponent(message)}`;
}

function countMessagesByRole(messages: UIMessage[], role: "user" | "assistant") {
  return messages.filter((message) => message.role === role).length;
}

function getCorsOrigin(req: Request) {
  return req.headers.get("origin") ?? "*";
}

function createCorsHeaders(req: Request) {
  const origin = getCorsOrigin(req);
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-company-public-key, x-company-api-key, x-company-id, x-company-slug",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(response: Response, req: Request) {
  const headers = new Headers(response.headers);
  const corsHeaders = createCorsHeaders(req);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isPrismaConnectivityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("getaddrinfo ENOTFOUND") ||
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    (typeof error === "object" && error !== null && "clientVersion" in error)
  );
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(req),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const session = await getCurrentSession();
    const developerOverride = session?.user.role === "DEVELOPER";
    const messages = body.messages ?? [];

    const companySlug =
      body.companySlug ?? req.headers.get("x-company-slug") ?? undefined;
    const apiKey = body.apiKey ?? req.headers.get("x-company-api-key") ?? undefined;
    const publicKey =
      body.publicKey ?? req.headers.get("x-company-public-key") ?? undefined;
    const companyId =
      body.companyId ?? req.headers.get("x-company-id") ?? undefined;
    const isPublicWidgetRequest = Boolean(publicKey);

    if (!companySlug && !apiKey && !publicKey && !companyId) {
      return withCors(
        toStreamingTextResponse(
          "Missing tenant identity. Provide companySlug, companyId, or public key.",
          400,
        ),
        req,
      );
    }

    const company = await getCompanyByIdentifier({
      companySlug,
      apiKey,
      publicKey,
      companyId,
    });

    if (!company) {
      return withCors(
        toJsonErrorResponse("Invalid company credentials. Please contact support.", 401),
        req,
      );
    }

    // Domain verification is the primary gatekeeper for widget requests.
    if (isPublicWidgetRequest) {
      const requestHost = extractRequestHost(req);
      const validOrigin = isAuthorizedDomain(requestHost, company.authorizedDomain);
      if (!validOrigin) {
        return withCors(
          toJsonErrorResponse(
            "This domain is not authorized to use this Olabits API Key.",
            403,
          ),
          req,
        );
      }
    } else if (apiKey) {
      const requestHost = extractRequestHost(req);
      const validOrigin = isAuthorizedDomain(requestHost, company.authorizedDomain);
      if (!validOrigin) {
        return withCors(
          toJsonErrorResponse(
            "This domain is not authorized to use this Olabits API Key.",
            403,
          ),
          req,
        );
      }
    }

    const latestUserMessage = extractLatestUserMessage(messages);
    const customerPhone = extractCustomerPhoneFromMessages(messages);
    const previewPlan = toBillingPlan(body.previewPlan);
    const effectivePlan = previewPlan ?? company.plan;
    const previewMode = previewPlan !== null;
    const access = getPlanAccess(effectivePlan);
    const hasInventoryAccess = access.properties || developerOverride;
    const hasWhatsappRouting = access.whatsapp || developerOverride;

    if (!previewMode && !developerOverride) {
      const subscriptionExpired =
        company.planExpiresAt !== null &&
        company.planExpiresAt !== undefined &&
        company.planExpiresAt.getTime() < Date.now();

      if (!company.isSubscribed || subscriptionExpired) {
        if (isPublicWidgetRequest) {
          return withCors(
            toJsonErrorResponse("Subscription inactive for this domain.", 402),
            req,
          );
        }
        return withCors(
          toStreamingTextResponse("This service is temporarily unavailable."),
          req,
        );
      }
    }

    let properties: PropertyForPrompt[] = [];
    if (hasInventoryAccess) {
      try {
        properties = await getAvailablePropertiesByCompanyId(company.id);
      } catch (error) {
        console.error("Database lookup failed:", error);
        return withCors(toStreamingTextResponse(dbUnavailableMessage), req);
      }
    }

    const inventoryText = hasInventoryAccess
      ? inventoryToText(properties)
      : "Inventory access is disabled for the SILVER plan. Provide general real estate guidance only.";
    const interestedProperty = hasInventoryAccess
      ? detectInterestedProperty(latestUserMessage, properties)
      : null;
    const needsWhatsappHandoff =
      hasWhatsappRouting &&
      hasStrongInterest(latestUserMessage) &&
      interestedProperty !== null;

    const whatsappInstruction = !hasWhatsappRouting
      ? "This account is on the SILVER plan. Do not offer WhatsApp agent routing."
      : needsWhatsappHandoff
      ? customerPhone
        ? `The user is interested in "${interestedProperty.title}" and already shared phone number "${customerPhone}". Include this exact WhatsApp handoff line: I can schedule a viewing for the ${interestedProperty.title}. Click here to chat with the agent on WhatsApp: ${createWhatsappLink(
            company.whatsappNum,
            interestedProperty.title,
            customerPhone,
          )}`
        : `The user appears interested in "${interestedProperty.title}" but has not shared a phone number yet. Ask for their phone number first. Only generate a WhatsApp link after they provide it.`
      : `When a user asks to chat with an agent on WhatsApp, first collect their phone number if missing. Once provided, generate a WhatsApp link containing the selected property name and customer phone number. Always use this company WhatsApp number: ${company.whatsappNum}`;

    const systemInstruction = `You are a Real Estate Agent for ${company.name}.
Company personality and communication style:
${company.systemPrompt}

${hasInventoryAccess ? `Below is the CURRENT inventory from our database for ${company.name}:` : "SILVER plan restrictions:"}
${inventoryText}

${hasInventoryAccess
    ? "Use this real-time data to answer user questions. If a property is not in this list, do not invent it."
    : "Offer general real estate advice and market guidance only. Do not claim to access live listings."}
If nothing matches the user's request, clearly say we have new deals coming soon and request their contact details for alerts.
Treat location names as exact strings. "Lekki Phase 1" and "Ibeju-Lekki" are different locations and must never be merged.
${whatsappInstruction}`;

    if (hasAdvancedAnalytics(effectivePlan) || developerOverride) {
      try {
        const prisma = getPrismaClient();
        await prisma.conversationAnalytics.create({
          data: {
            companyId: company.id,
            latestUserMessage,
            userMessageCount: countMessagesByRole(messages, "user"),
            assistantMessageCount: countMessagesByRole(messages, "assistant"),
            totalMessageCount: messages.length,
          },
        });
      } catch (error) {
        console.error("Conversation analytics save failed:", error);
      }
    }

    const result = streamText({
      model: realEstateModel,
      system: systemInstruction,
      messages: await convertToModelMessages(messages),
    });

    return withCors(result.toUIMessageStreamResponse(), req);
  } catch (error) {
    console.error("Chat route error:", error);
    if (isPrismaConnectivityError(error)) {
      return withCors(toStreamingTextResponse(dbUnavailableMessage), req);
    }
    return withCors(toStreamingTextResponse(genericUnavailableMessage), req);
  }
}
