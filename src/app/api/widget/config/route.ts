import { getCompanyByIdentifier } from "@/lib/db";
import { extractRequestHost, isAuthorizedDomain } from "@/lib/domain";

function createCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-company-public-key",
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

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(req),
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const key = (url.searchParams.get("key") ?? "").trim();
    const apiKey = (url.searchParams.get("apiKey") ?? "").trim();
    const legacyHeaderApiKey =
      (req.headers.get("x-company-api-key") ?? "").trim();

    if (!key && !apiKey && !legacyHeaderApiKey) {
      return withCors(
        Response.json({ error: "Missing widget key." }, { status: 400 }),
        req,
      );
    }

    const company = await getCompanyByIdentifier({
      ...(key ? { publicKey: key } : {}),
      ...(apiKey || legacyHeaderApiKey
        ? { apiKey: apiKey || legacyHeaderApiKey }
        : {}),
    });
    if (!company) {
      return withCors(
        Response.json({ error: "Invalid API key." }, { status: 401 }),
        req,
      );
    }

    const requestHost = extractRequestHost(req);
    const validOrigin = isAuthorizedDomain(requestHost, company.authorizedDomain);
    if (!validOrigin) {
      return withCors(
        Response.json(
          { error: "This domain is not authorized to use this Olabits API Key." },
          { status: 403 },
        ),
        req,
      );
    }

    const subscriptionExpired =
      company.planExpiresAt !== null &&
      company.planExpiresAt !== undefined &&
      company.planExpiresAt.getTime() < Date.now();

    if (!company.isSubscribed || subscriptionExpired) {
      return withCors(
        Response.json({ error: "Subscription inactive for this domain." }, { status: 402 }),
        req,
      );
    }

    return withCors(
      Response.json(
        {
          companyId: company.id,
          companyName: company.name,
          plan: company.plan,
          isSubscribed: company.isSubscribed,
          chatEndpoint: "/api/chat",
          brandColor: "#0f4c81",
        },
        { status: 200 },
      ),
      req,
    );
  } catch (error) {
    console.error("Widget config route failed:", error);
    return withCors(
      Response.json({ error: "Unable to load widget config." }, { status: 500 }),
      req,
    );
  }
}
