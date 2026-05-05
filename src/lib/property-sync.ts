import crypto from "node:crypto";
import { DataSyncStatus, PropertySource } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";

const LOCK_TTL_MS = 15 * 60 * 1000;

type IncomingProperty = {
  externalId?: unknown;
  id?: unknown;
  url?: unknown;
  title?: unknown;
  description?: unknown;
  price?: unknown;
  location?: unknown;
  propertyType?: unknown;
  isAvailable?: unknown;
};

type NormalizedProperty = {
  sourceListingId: string;
  title: string;
  description: string;
  price: number;
  location: string;
  propertyType: string;
  isAvailable: boolean;
};

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") return Number.NaN;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function externalCandidate(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function hashedListingId(seed: string) {
  return `hash_${crypto.createHash("sha1").update(seed).digest("hex").slice(0, 24)}`;
}

function resolveListingId(property: IncomingProperty, fallbackSeed: string) {
  const externalId =
    externalCandidate(property.externalId) ||
    externalCandidate(property.id) ||
    toText(property.url);
  if (externalId) {
    return `ext_${externalId}`.slice(0, 120);
  }
  return hashedListingId(fallbackSeed);
}

function normalizeProperty(property: IncomingProperty): NormalizedProperty | null {
  const title = toText(property.title);
  const location = toText(property.location) || "Unspecified";
  const propertyType = toText(property.propertyType) || "Listing";
  const description = toText(property.description) || "Imported listing from client source.";
  const parsedPrice = parsePrice(property.price);
  const price = Number.isFinite(parsedPrice) ? Math.max(parsedPrice, 0) : Number.NaN;

  if (!title || Number.isNaN(price)) return null;

  const sourceListingId = resolveListingId(
    property,
    `${title}|${location}|${propertyType}|${price}`,
  );

  return {
    sourceListingId,
    title,
    description,
    price,
    location,
    propertyType,
    isAvailable: typeof property.isAvailable === "boolean" ? property.isAvailable : true,
  };
}

export function extractPropertiesFromPayload(payload: unknown): IncomingProperty[] {
  if (Array.isArray(payload)) {
    return payload as IncomingProperty[];
  }
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.properties)) return obj.properties as IncomingProperty[];
  if (Array.isArray(obj.listings)) return obj.listings as IncomingProperty[];
  if (Array.isArray(obj.data)) return obj.data as IncomingProperty[];
  return [];
}

export async function acquireSyncLock(companyId: string) {
  const prisma = getPrismaClient();
  const staleThreshold = new Date(Date.now() - LOCK_TTL_MS);
  const now = new Date();

  const result = await prisma.company.updateMany({
    where: {
      id: companyId,
      OR: [
        { dataSourceSyncInProgressAt: null },
        { dataSourceSyncInProgressAt: { lt: staleThreshold } },
      ],
    },
    data: {
      dataSourceSyncInProgressAt: now,
      dataSourceLastSyncStatus: DataSyncStatus.RUNNING,
      dataSourceLastSyncMessage: "Property sync is running.",
    },
  });

  return result.count === 1;
}

export async function finishSyncSuccess(
  companyId: string,
  processed: number,
  message: string,
) {
  const prisma = getPrismaClient();
  await prisma.company.update({
    where: { id: companyId },
    data: {
      dataSourceSyncInProgressAt: null,
      dataSourceLastSyncedAt: new Date(),
      dataSourceLastSyncStatus: DataSyncStatus.SUCCESS,
      dataSourceLastSyncMessage: message,
      dataSourceLastSyncedCount: processed,
    },
  });
}

export async function finishSyncFailure(companyId: string, message: string) {
  const prisma = getPrismaClient();
  await prisma.company.update({
    where: { id: companyId },
    data: {
      dataSourceSyncInProgressAt: null,
      dataSourceLastSyncStatus: DataSyncStatus.FAILED,
      dataSourceLastSyncMessage: message.slice(0, 500),
    },
  });
}

export async function runPropertySync({
  companyId,
  properties,
  replaceExisting = true,
}: {
  companyId: string;
  properties: IncomingProperty[];
  replaceExisting?: boolean;
}) {
  const prisma = getPrismaClient();
  const normalized = properties
    .map(normalizeProperty)
    .filter((item): item is NormalizedProperty => item !== null);

  if (normalized.length === 0) {
    throw new Error("No valid properties found in payload.");
  }

  const sourceIds = normalized.map((item) => item.sourceListingId);
  let deactivated = 0;

  await prisma.$transaction(async (tx) => {
    for (const property of normalized) {
      await tx.property.upsert({
        where: {
          companyId_sourceListingId: {
            companyId,
            sourceListingId: property.sourceListingId,
          },
        },
        update: {
          title: property.title,
          description: property.description,
          price: property.price,
          location: property.location,
          propertyType: property.propertyType,
          isAvailable: property.isAvailable,
          sourceType: PropertySource.CLIENT_SYNC,
        },
        create: {
          companyId,
          sourceListingId: property.sourceListingId,
          sourceType: PropertySource.CLIENT_SYNC,
          title: property.title,
          description: property.description,
          price: property.price,
          location: property.location,
          propertyType: property.propertyType,
          isAvailable: property.isAvailable,
        },
      });
    }

    if (replaceExisting) {
      const updateResult = await tx.property.updateMany({
        where: {
          companyId,
          sourceType: PropertySource.CLIENT_SYNC,
          sourceListingId: { notIn: sourceIds },
        },
        data: {
          isAvailable: false,
        },
      });
      deactivated = updateResult.count;
    }
  });

  return {
    received: properties.length,
    processed: normalized.length,
    upserted: normalized.length,
    deactivated,
  };
}
