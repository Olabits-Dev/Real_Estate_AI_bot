import { getPrismaClient } from "@/lib/prisma";
import {
  acquireSyncLock,
  extractPropertiesFromPayload,
  finishSyncFailure,
  finishSyncSuccess,
  runPropertySync,
} from "@/lib/property-sync";

export const runtime = "nodejs";

function readSourceKey(req: Request) {
  const headerKey = req.headers.get("x-client-source-key")?.trim();
  if (headerKey) return headerKey;

  const auth = req.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  try {
    const url = new URL(req.url);
    const queryKey = url.searchParams.get("key")?.trim();
    return queryKey || "";
  } catch {
    return "";
  }
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: Request) {
  const prisma = getPrismaClient();
  const sourceKey = readSourceKey(request);
  if (!sourceKey) {
    return Response.json({ error: "Missing source API key." }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { dataSourceApiKey: sourceKey },
    select: { id: true, name: true },
  });
  if (!company) {
    return Response.json({ error: "Invalid source API key." }, { status: 401 });
  }

  const lockAcquired = await acquireSyncLock(company.id);
  if (!lockAcquired) {
    return Response.json(
      { error: "A sync is already in progress for this company." },
      { status: 409 },
    );
  }

  try {
    const payload = (await request.json()) as unknown;
    const properties = extractPropertiesFromPayload(payload);
    const replaceExisting =
      typeof payload === "object" &&
      payload !== null &&
      "replaceExisting" in payload &&
      typeof (payload as Record<string, unknown>).replaceExisting === "boolean"
        ? ((payload as Record<string, unknown>).replaceExisting as boolean)
        : true;

    const result = await runPropertySync({
      companyId: company.id,
      properties,
      replaceExisting,
    });
    const message = `Sync completed: ${result.upserted} listing(s) processed.`;
    await finishSyncSuccess(company.id, result.processed, message);

    return Response.json(
      {
        success: true,
        companyId: company.id,
        companyName: company.name,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = toMessage(error);
    await finishSyncFailure(company.id, message);
    return Response.json({ error: message }, { status: 400 });
  }
}
