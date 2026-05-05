import type { BillingPlanName } from "@/lib/billing-plan";

type AnalyticsTier = "basic" | "advanced";

export type PlanAccess = {
  properties: boolean;
  leads: boolean;
  analytics: AnalyticsTier;
  whatsapp: boolean;
  export?: boolean;
};

export const PLAN_ACCESS: Record<BillingPlanName, PlanAccess> = {
  SILVER: {
    properties: false,
    leads: false,
    analytics: "basic",
    whatsapp: false,
  },
  GOLD: {
    properties: true,
    leads: true,
    analytics: "basic",
    whatsapp: true,
  },
  PLATINUM: {
    properties: true,
    leads: true,
    analytics: "advanced",
    whatsapp: true,
    export: true,
  },
};

export function normalizePlan(plan: BillingPlanName | null | undefined): BillingPlanName {
  return plan ?? "SILVER";
}

export function getPlanAccess(plan: BillingPlanName | null | undefined): PlanAccess {
  return PLAN_ACCESS[normalizePlan(plan)];
}

export function hasAdvancedAnalytics(plan: BillingPlanName | null | undefined) {
  return getPlanAccess(plan).analytics === "advanced";
}
