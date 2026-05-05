function stripWww(host: string) {
  return host.replace(/^www\./, "");
}

export function normalizeDomain(value: string) {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";

  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(candidate);
    return stripWww(parsed.hostname).replace(/\.$/, "");
  } catch {
    return stripWww(
      raw
        .replace(/^https?:\/\//i, "")
        .split("/")[0]
        .split(":")[0]
        .replace(/\.$/, ""),
    );
  }
}

export function extractRequestHost(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) {
    const host = normalizeDomain(origin);
    if (host) return host;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    const host = normalizeDomain(referer);
    if (host) return host;
  }

  return null;
}

export function isAuthorizedDomain(
  requestHost: string | null,
  authorizedDomain: string,
) {
  if (!requestHost) return false;
  return normalizeDomain(requestHost) === normalizeDomain(authorizedDomain);
}

