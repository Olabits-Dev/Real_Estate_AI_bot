import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getDashboardCompany } from "@/lib/company-context";
import { getCurrentSession } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { toBillingPlan } from "@/lib/billing-plan";
import { initializeTransaction, resolvePlanCode } from "@/lib/paystack";
import { getPrismaClient } from "@/lib/prisma";

const planAmountsInKobo = {
  SILVER: 1500000,
  GOLD: 4500000,
  PLATINUM: 10000000,
} as const;

function statusFromError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("PAYSTACK_SECRET_KEY is not configured")) {
    return "paystack_not_configured";
  }
  if (message.includes("Missing Paystack plan code")) {
    return "plan_not_configured";
  }
  if (message.includes("Billing email is required")) {
    return "missing_email";
  }
  return "checkout_error";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ plan: string }> },
) {
  const prisma = getPrismaClient();
  const params = await context.params;
  const plan = toBillingPlan(params.plan);

  if (!plan) {
    return NextResponse.redirect(new URL("/dashboard/billing", getAppBaseUrl()));
  }

  try {
    const company = await getDashboardCompany();
    const session = await getCurrentSession();
    if (!company) {
      return NextResponse.redirect(new URL("/dashboard/billing", getAppBaseUrl()));
    }

    const billingEmail =
      company.billingEmail ?? session?.user.email?.toLowerCase() ?? "";

    if (!billingEmail) {
      return NextResponse.redirect(
        new URL(`/dashboard/billing?status=missing_email&upgrade=${plan}`, getAppBaseUrl()),
      );
    }

    const reference = `upgrade_${company.id}_${Date.now()}_${crypto
      .randomUUID()
      .slice(0, 8)}`;

    const initialized = await initializeTransaction({
      email: billingEmail,
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
        billingEmail,
        paystackLastReference: initialized.reference,
      },
    });

    return NextResponse.redirect(initialized.authorization_url);
  } catch (error) {
    console.error("Billing upgrade route failed:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/billing?status=${statusFromError(error)}&upgrade=${plan}`,
        getAppBaseUrl(),
      ),
    );
  }
}
