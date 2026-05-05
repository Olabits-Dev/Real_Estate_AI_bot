import { CheckCircle2, Crown, Gem, Shield } from "lucide-react";
import { getDashboardCompany } from "@/lib/company-context";
import { cancelSubscription, subscribeToPlan } from "@/app/dashboard/billing/actions";
import { getCurrentSession } from "@/lib/auth";

type BillingPlanCard = {
  key: "SILVER" | "GOLD" | "PLATINUM";
  name: string;
  price: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
};

const plans: BillingPlanCard[] = [
  {
    key: "SILVER",
    name: "Silver",
    price: "₦15,000 / month",
    description: "Basic Bot plan for small real estate teams.",
    icon: <Shield className="h-4 w-4" />,
    features: ["Basic Bot"],
  },
  {
    key: "GOLD",
    name: "Gold",
    price: "₦45,000 / month",
    description: "Automation plan with integrations and WhatsApp handoff.",
    icon: <Crown className="h-4 w-4" />,
    features: ["DB Integration", "WhatsApp Routing"],
  },
  {
    key: "PLATINUM",
    name: "Platinum",
    price: "₦100,000 / month",
    description: "Complete suite for full operations and visibility.",
    icon: <Gem className="h-4 w-4" />,
    features: ["Full Dashboard", "Analytics"],
  },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const company = await getDashboardCompany();
  const session = await getCurrentSession();

  if (!company) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create or select a company before managing subscriptions.
        </p>
      </section>
    );
  }

  const defaultEmail =
    company.billingEmail ?? session?.user.email?.toLowerCase() ?? "";

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Billing</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Subscription Plans for {company.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Current status:{" "}
          <span className={company.isSubscribed ? "text-emerald-700" : "text-rose-700"}>
            {company.isSubscribed ? "Active" : "Inactive"}
          </span>
          {company.plan ? ` • ${company.plan}` : ""}
        </p>
      </div>

      {status === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Payment initiated successfully. We are confirming your subscription status.
        </div>
      )}
      {status === "missing_email" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add a billing email first, then retry the upgrade to continue to Paystack.
        </div>
      )}
      {status === "paystack_not_configured" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Payment gateway is not configured yet. Please contact support.
        </div>
      )}
      {status === "plan_not_configured" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Selected plan is temporarily unavailable. Please contact support.
        </div>
      )}
      {status === "invalid_plan" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Invalid plan selected. Please retry from the billing page.
        </div>
      )}
      {status === "missing_company" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No active company found for this account. Please re-login and try again.
        </div>
      )}
      {status === "checkout_error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Payment initialization failed. Please try again shortly.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.key}
            className={`rounded-xl border bg-white p-5 shadow-sm ${
              company.plan === plan.key && company.isSubscribed
                ? "border-emerald-300"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
              <span className="rounded-full bg-slate-100 p-2 text-slate-700">
                {plan.icon}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{plan.price}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {feature}
                </li>
              ))}
            </ul>

            <form action={subscribeToPlan} className="mt-4 space-y-2">
              <input type="hidden" name="plan" value={plan.key} />
              <input
                type="email"
                name="billingEmail"
                defaultValue={defaultEmail}
                placeholder="billing@company.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                required
              />
              <p className="text-xs text-slate-500">
                Defaults to your registered account email. You can change it.
              </p>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Subscribe
              </button>
            </form>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Manage Subscription</h3>
        <p className="mt-1 text-sm text-slate-600">
          Use this to stop recurring billing when needed.
        </p>
        <form action={cancelSubscription} className="mt-3">
          <button
            type="submit"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Cancel Subscription
          </button>
        </form>
      </div>
    </section>
  );
}
