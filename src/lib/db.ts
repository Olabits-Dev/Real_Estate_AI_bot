import { getPrismaClient } from "@/lib/prisma";

export type CompanyIdentifier = {
  companySlug?: string;
  apiKey?: string;
  publicKey?: string;
  companyId?: string;
};

export async function getCompanyByIdentifier({
  companySlug,
  apiKey,
  publicKey,
  companyId,
}: CompanyIdentifier) {
  const prisma = getPrismaClient();

  if (publicKey) {
    return prisma.company.findUnique({
      where: { publicKey },
    });
  }

  if (apiKey) {
    return prisma.company.findUnique({
      where: { apiKey },
    });
  }

  if (companySlug) {
    return prisma.company.findUnique({
      where: { slug: companySlug },
    });
  }

  if (companyId) {
    return prisma.company.findUnique({
      where: { id: companyId },
    });
  }

  return null;
}

export async function getAvailablePropertiesByCompanyId(companyId: string) {
  const prisma = getPrismaClient();

  return prisma.property.findMany({
    where: {
      companyId,
      isAvailable: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
