import crypto from "node:crypto";

const PAYSTACK_API_BASE = "https://api.paystack.co";

export const planCodeByTier = {
  SILVER: process.env.PAYSTACK_PLAN_SILVER_CODE ?? "",
  GOLD: process.env.PAYSTACK_PLAN_GOLD_CODE ?? "",
  PLATINUM: process.env.PAYSTACK_PLAN_PLATINUM_CODE ?? "",
} as const;

export type BillingPlan = keyof typeof planCodeByTier;

type PaystackInitializeParams = {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  planCode?: string;
};

type PaystackInitializeResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type PaystackVerifyData = {
  reference: string;
  status: string;
  paid_at?: string | null;
  customer?: { customer_code?: string; email?: string };
  authorization?: { authorization_code?: string };
  metadata?: Record<string, unknown>;
  plan_object?: { plan_code?: string };
  plan?: string;
};

type PaystackCreateSubscriptionParams = {
  customerCode: string;
  planCode: string;
  authorizationCode?: string;
  startDate?: string;
};

type PaystackSubscriptionData = {
  subscription_code: string;
  email_token?: string;
  status: string;
};

type PaystackDisableSubscriptionParams = {
  code: string;
  token: string;
};

function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }
  return secretKey;
}

async function paystackRequest<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const secretKey = getPaystackSecretKey();
  const response = await fetch(`${PAYSTACK_API_BASE}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    status: boolean;
    message?: string;
    data?: T;
  };

  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message ?? `Paystack request failed: ${response.status}`);
  }

  return payload.data;
}

export async function initializeTransaction({
  email,
  amount,
  reference,
  callbackUrl,
  metadata,
  planCode,
}: PaystackInitializeParams): Promise<PaystackInitializeResponse> {
  return paystackRequest<PaystackInitializeResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount,
      reference,
      callback_url: callbackUrl,
      metadata,
      ...(planCode ? { plan: planCode } : {}),
    }),
  });
}

export async function verifyTransaction(reference: string): Promise<PaystackVerifyData> {
  return paystackRequest<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
    },
  );
}

export async function createSubscription({
  customerCode,
  planCode,
  authorizationCode,
  startDate,
}: PaystackCreateSubscriptionParams): Promise<PaystackSubscriptionData> {
  return paystackRequest<PaystackSubscriptionData>("/subscription", {
    method: "POST",
    body: JSON.stringify({
      customer: customerCode,
      plan: planCode,
      ...(authorizationCode ? { authorization: authorizationCode } : {}),
      ...(startDate ? { start_date: startDate } : {}),
    }),
  });
}

export async function disableSubscription({
  code,
  token,
}: PaystackDisableSubscriptionParams): Promise<void> {
  await paystackRequest<{ status: string }>("/subscription/disable", {
    method: "POST",
    body: JSON.stringify({
      code,
      token,
    }),
  });
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) return false;

  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(hash, "utf8");
  const received = Buffer.from(signature, "utf8");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

export function resolvePlanCode(plan: BillingPlan) {
  const code = planCodeByTier[plan];
  if (!code) {
    throw new Error(`Missing Paystack plan code for ${plan}.`);
  }
  return code;
}
