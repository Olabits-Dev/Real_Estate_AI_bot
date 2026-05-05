import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getDashboardCompany } from "@/lib/company-context";
import { toBillingPlan } from "@/lib/billing-plan";
import { initializeTransaction, resolvePlanCode } from "@/lib/paystack";
import { getPrismaClient } from "@/lib/prisma";

const planAmountsInKobo = {
  SILVER: 1500000,
  GOLD: 4500000,
  PLATINUM: 10000000,
} as const;

function getAppBaseUrl() {
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ plan: string }> },
) {
  const prisma = getPrismaClient();
  const company = await getDashboardCompany();
  const params = await context.params;
  const plan = toBillingPlan(params.plan);

  if (!company || !plan) {
    return NextResponse.redirect(new URL("/dashboard/billing", getAppBaseUrl()));
  }

  if (!company.billingEmail) {
    return NextResponse.redirect(
      new URL(`/dashboard/billing?status=missing_email&upgrade=${plan}`, getAppBaseUrl()),
    );
  }

  const reference = `upgrade_${company.id}_${Date.now()}_${crypto
    .randomUUID()
    .slice(0, 8)}`;

  const initialized = await initializeTransaction({
    email: company.billingEmail,
    amount: planAmountsInKobo[plan],
    reference,
    callbackUrl: `${getAppBaseUrl()}/dashboard/billing?status=success`,
    planCode: resolvePlanCode(plan),
    metadata: {
      companyId: company.id,
      plan,
      source: "upgrade-cta",
    },
  });

  await prisma.company.update({
    where: { id: company.id },
    data: {
      plan,
      paystackLastReference: initialized.reference,
    },
  });

  return NextResponse.redirect(initialized.authorization_url);
}
