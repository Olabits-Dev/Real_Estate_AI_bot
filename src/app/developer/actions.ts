"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

const ACTIVE_COMPANY_COOKIE = "dashboard_active_company_id";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function openClientWorkspace(formData: FormData) {
  await requireRole("DEVELOPER");
  const prisma = getPrismaClient();
  const companyId = getFormValue(formData, "companyId");
  if (!companyId) throw new Error("companyId is required.");

  const exists = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!exists) throw new Error("Company not found.");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  redirect("/dashboard");
}
