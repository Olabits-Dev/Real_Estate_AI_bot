import { headers } from "next/headers";

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/g, "");
}

function getConfiguredBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.APP_BASE_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  // Vercel system env fallback for production-safe absolute URLs.
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return normalizeBaseUrl(productionHost);
  }
  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    return normalizeBaseUrl(deploymentHost);
  }

  return "";
}

export function getAppBaseUrl() {
  const configured = getConfiguredBaseUrl();
  if (configured) return configured;
  return "http://localhost:3000";
}

export async function getRuntimeAppBaseUrl() {
  const configured = getConfiguredBaseUrl();
  if (configured) return configured;

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  if (host) {
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`.replace(/\/+$/g, "");
  }

  return "http://localhost:3000";
}

export function getPaystackWebhookUrl() {
  return `${getAppBaseUrl()}/api/webhooks/paystack`;
}
