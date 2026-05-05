import { headers } from "next/headers";

export function getAppBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.APP_BASE_URL?.trim();
  if (configured) {
    return (/^https?:\/\//i.test(configured)
      ? configured
      : `https://${configured}`
    ).replace(/\/+$/g, "");
  }
  return "http://localhost:3000";
}

export async function getRuntimeAppBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.APP_BASE_URL?.trim();
  if (configured) {
    return (/^https?:\/\//i.test(configured)
      ? configured
      : `https://${configured}`
    ).replace(/\/+$/g, "");
  }

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  if (host) {
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`.replace(/\/+$/g, "");
  }

  return "http://localhost:3000";
}
