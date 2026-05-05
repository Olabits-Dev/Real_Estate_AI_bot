import { getPrismaClient } from "@/lib/prisma";
import { getPaystackWebhookUrl } from "@/lib/app-url";
import {
  createSubscription,
  planCodeByTier,
  verifyPaystackWebhookSignature,
} from "@/lib/paystack";

export const runtime = "nodejs";

type PlanName = "SILVER" | "GOLD" | "PLATINUM";

type PaystackWebhookEvent = {
  event: string;
  data?: Record<string, unknown>;
};

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getPlanFromValue(value: unknown): PlanName | undefined {
  if (value === "SILVER" || value === "GOLD" || value === "PLATINUM") {
    return value;
  }
  return undefined;
}

function getPlanFromCode(code?: string): PlanName | undefined {
  if (!code) return undefined;
  if (planCodeByTier.SILVER && code === planCodeByTier.SILVER) return "SILVER";
  if (planCodeByTier.GOLD && code === planCodeByTier.GOLD) return "GOLD";
  if (planCodeByTier.PLATINUM && code === planCodeByTier.PLATINUM) return "PLATINUM";
  return undefined;
}

function plusThirtyDays(dateInput?: string) {
  const base = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const expires = new Date(base);
  expires.setDate(expires.getDate() + 30);
  return expires;
}

async function findCompanyFromPayload(data: Record<string, unknown>) {
  const prisma = getPrismaClient();
  const metadata = (data.metadata as Record<string, unknown> | undefined) ?? {};
  const companyId = getString(metadata.companyId);
  if (companyId) {
    const byId = await prisma.company.findUnique({ where: { id: companyId } });
    if (byId) return byId;
  }

  const reference = getString(data.reference);
  if (reference) {
    const byReference = await prisma.company.findFirst({
      where: { paystackLastReference: reference },
    });
    if (byReference) return byReference;
  }

  const customer = (data.customer as Record<string, unknown> | undefined) ?? {};
  const customerCode =
    getString(customer.customer_code) ?? getString(data.customer_code);
  if (customerCode) {
    const byCustomerCode = await prisma.company.findFirst({
      where: { paystackCustomerCode: customerCode },
    });
    if (byCustomerCode) return byCustomerCode;
  }

  const customerEmail = getString(customer.email) ?? getString(data.email);
  if (customerEmail) {
    const byEmail = await prisma.company.findFirst({
      where: { billingEmail: customerEmail.toLowerCase() },
    });
    if (byEmail) return byEmail;
  }

  const subscriptionCode = getString(data.subscription_code);
  if (subscriptionCode) {
    return prisma.company.findFirst({
      where: { paystackSubscriptionCode: subscriptionCode },
    });
  }

  return null;
}

export async function GET() {
  return Response.json(
    {
      ok: true,
      webhookUrl: getPaystackWebhookUrl(),
      note: "Set this URL in Paystack Dashboard -> API Keys & Webhooks.",
    },
    { status: 200 },
  );
}

async function handleChargeSuccess(data: Record<string, unknown>) {
  const prisma = getPrismaClient();
  const company = await findCompanyFromPayload(data);
  if (!company) return;

  const metadata = (data.metadata as Record<string, unknown> | undefined) ?? {};
  const customer = (data.customer as Record<string, unknown> | undefined) ?? {};
  const authorization =
    (data.authorization as Record<string, unknown> | undefined) ?? {};
  const planCode =
    getString((data.plan_object as Record<string, unknown> | undefined)?.plan_code) ??
    getString((data.plan as Record<string, unknown> | undefined)?.plan_code) ??
    getString(data.plan_code) ??
    getString(data.plan);
  const planFromCode = getPlanFromCode(planCode);
  const plan = planFromCode ?? getPlanFromValue(metadata.plan) ?? company.plan ?? undefined;
  const paidAt = getString(data.paid_at);
  const reference = getString(data.reference);
  const customerCode = getString(customer.customer_code);
  const billingEmail = getString(customer.email)?.toLowerCase();
  const authorizationCode = getString(authorization.authorization_code);

  await prisma.company.update({
    where: { id: company.id },
    data: {
      ...(plan ? { plan } : {}),
      isSubscribed: true,
      planExpiresAt: plusThirtyDays(paidAt),
      ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
      ...(billingEmail ? { billingEmail } : {}),
      ...(reference ? { paystackLastReference: reference } : {}),
    },
  });

  if (
    customerCode &&
    planCode &&
    authorizationCode &&
    !company.paystackSubscriptionCode
  ) {
    try {
      const subscription = await createSubscription({
        customerCode,
        planCode,
        authorizationCode,
      });
      await prisma.company.update({
        where: { id: company.id },
        data: {
          paystackSubscriptionCode: subscription.subscription_code,
          paystackSubscriptionEmailToken:
            subscription.email_token ?? company.paystackSubscriptionEmailToken,
        },
      });
    } catch (error) {
      console.error("Paystack create subscription fallback error:", error);
    }
  }
}

async function handleSubscriptionCreate(data: Record<string, unknown>) {
  const prisma = getPrismaClient();
  const company = await findCompanyFromPayload(data);
  if (!company) return;

  const customer = (data.customer as Record<string, unknown> | undefined) ?? {};
  const planRecord = (data.plan as Record<string, unknown> | undefined) ?? {};
  const customerCode =
    getString(customer.customer_code) ?? getString(data.customer_code);
  const subscriptionCode = getString(data.subscription_code);
  const emailToken = getString(data.email_token);
  const planCode = getString(planRecord.plan_code) ?? getString(data.plan_code);
  const plan = getPlanFromCode(planCode) ?? company.plan ?? undefined;
  const nextPaymentDate =
    getString(data.next_payment_date) ?? getString(data.next_payment_date_time);

  await prisma.company.update({
    where: { id: company.id },
    data: {
      ...(plan ? { plan } : {}),
      isSubscribed: true,
      ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
      ...(subscriptionCode ? { paystackSubscriptionCode: subscriptionCode } : {}),
      ...(emailToken ? { paystackSubscriptionEmailToken: emailToken } : {}),
      planExpiresAt: plusThirtyDays(nextPaymentDate),
    },
  });
}

async function handleInvoicePaymentFailed(data: Record<string, unknown>) {
  const prisma = getPrismaClient();
  const company = await findCompanyFromPayload(data);
  if (!company) return;

  await prisma.company.update({
    where: { id: company.id },
    data: {
      isSubscribed: false,
    },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: PaystackWebhookEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const data = payload.data ?? {};

  try {
    if (payload.event === "charge.success") {
      await handleChargeSuccess(data);
    } else if (payload.event === "subscription.create") {
      await handleSubscriptionCreate(data);
    } else if (payload.event === "invoice.payment_failed") {
      await handleInvoicePaymentFailed(data);
    }
  } catch (error) {
    console.error("Paystack webhook processing error:", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
