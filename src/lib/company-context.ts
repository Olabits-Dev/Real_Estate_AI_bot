import { getPrismaClient } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth";

const ACTIVE_COMPANY_COOKIE = "dashboard_active_company_id";

export async function getDashboardCompany() {
  const prisma = getPrismaClient();
  const session = await getCurrentSession();
  if (!session) return null;

  if (session.user.role === "SUBSCRIBER") {
    const firstMembership = session.user.memberships.at(0);
    if (!firstMembership) return null;
    try {
      return await prisma.company.findUnique({
        where: { id: firstMembership.companyId },
      });
    } catch (error) {
      console.error("Subscriber company lookup failed:", error);
      return null;
    }
  }

  const cookieStore = await cookies();
  const activeCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;
  const envCompanyId =
    process.env.DASHBOARD_COMPANY_ID ?? process.env.NEXT_PUBLIC_COMPANY_ID;

  if (activeCompanyId) {
    try {
      const byCookie = await prisma.company.findUnique({
        where: { id: activeCompanyId },
      });
      if (byCookie) return byCookie;
    } catch (error) {
      console.error("Dashboard company lookup failed (cookie):", error);
      return null;
    }
  }

  if (envCompanyId) {
    try {
      const byId = await prisma.company.findUnique({
        where: { id: envCompanyId },
      });
      if (byId) return byId;
    } catch (error) {
      console.error("Dashboard company lookup failed (env):", error);
      return null;
    }
  }

  try {
    return await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Dashboard company lookup failed (fallback):", error);
    return null;
  }
}

export async function getAllDashboardCompanies() {
  const prisma = getPrismaClient();
  const session = await getCurrentSession();
  if (!session) return [];

  if (session.user.role === "SUBSCRIBER") {
    const companyIds = session.user.memberships.map((membership) => membership.companyId);
    if (!companyIds.length) return [];
    try {
      return await prisma.company.findMany({
        where: { id: { in: companyIds } },
        orderBy: { createdAt: "asc" },
      });
    } catch (error) {
      console.error("Subscriber companies query failed:", error);
      return [];
    }
  }

  try {
    return await prisma.company.findMany({
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Dashboard companies query failed:", error);
    return [];
  }
}
