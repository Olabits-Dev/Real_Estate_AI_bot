"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDashboardCompany } from "@/lib/company-context";
import {
  disableSubscription,
  initializeTransaction,
  resolvePlanCode,
  type BillingPlan,
} from "@/lib/paystack";
import { getPrismaClient } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

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

function isBillingPlan(value: string): value is BillingPlan {
  return value === "SILVER" || value === "GOLD" || value === "PLATINUM";
}

const planAmountsInKobo: Record<BillingPlan, number> = {
  SILVER: 1500000,
  GOLD: 4500000,
  PLATINUM: 10000000,
};

export async function subscribeToPlan(formData: FormData) {
  const prisma = getPrismaClient();
  const company = await getDashboardCompany();
  const session = await getCurrentSession();
  if (!company) {
    throw new Error("No active company selected.");
  }

  const plan = getFormValue(formData, "plan");
  const billingEmailInput = getFormValue(formData, "billingEmail").toLowerCase();
  const sessionEmail = session?.user.email?.toLowerCase() ?? "";
  const billingEmail = billingEmailInput || company.billingEmail || sessionEmail;

  if (!isBillingPlan(plan)) {
    throw new Error("Invalid billing plan.");
  }
  if (!billingEmail) {
    throw new Error("Billing email is required. Add one in billing or profile.");
  }

  const reference = `olabits_${company.id}_${Date.now()}_${crypto
    .randomUUID()
    .slice(0, 8)}`;
  const callbackUrl = `${getAppBaseUrl()}/dashboard/billing?status=success`;

  const initialized = await initializeTransaction({
    email: billingEmail,
    amount: planAmountsInKobo[plan],
    reference,
    callbackUrl,
    planCode: resolvePlanCode(plan),
    metadata: {
      companyId: company.id,
      plan,
      source: "dashboard-billing",
    },
  });

  await prisma.company.update({
    where: { id: company.id },
    data: {
      billingEmail,
      paystackLastReference: initialized.reference,
      plan,
    },
  });

  revalidatePath("/dashboard/billing");
  redirect(initialized.authorization_url);
}

export async function cancelSubscription() {
  const prisma = getPrismaClient();
  const company = await getDashboardCompany();
  if (!company) {
    throw new Error("No active company selected.");
  }

  if (
    company.paystackSubscriptionCode &&
    company.paystackSubscriptionEmailToken
  ) {
    try {
      await disableSubscription({
        code: company.paystackSubscriptionCode,
        token: company.paystackSubscriptionEmailToken,
      });
    } catch (error) {
      console.error("Paystack disable subscription error:", error);
    }
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      isSubscribed: false,
      planExpiresAt: null,
    },
  });

  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/preview");
}
