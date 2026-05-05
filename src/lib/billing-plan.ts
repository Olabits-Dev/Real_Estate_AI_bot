export const BILLING_PLANS = ["SILVER", "GOLD", "PLATINUM"] as const;

export type BillingPlanName = (typeof BILLING_PLANS)[number];

export function toBillingPlan(value: unknown): BillingPlanName | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "SILVER") return "SILVER";
  if (normalized === "GOLD") return "GOLD";
  if (normalized === "PLATINUM") return "PLATINUM";
  return null;
}
