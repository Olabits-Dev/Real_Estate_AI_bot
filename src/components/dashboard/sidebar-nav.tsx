"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Puzzle,
  UserCircle2,
  X,
} from "lucide-react";
import type { BillingPlanName } from "@/lib/billing-plan";
import { getPlanAccess } from "@/lib/plans";

type SidebarNavProps = {
  plan: BillingPlanName | null | undefined;
  mobile?: boolean;
  isDeveloperView?: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  locked?: boolean;
  unlockPlan?: "GOLD" | "PLATINUM";
};

export function SidebarNav({
  plan,
  mobile = false,
  isDeveloperView = false,
}: SidebarNavProps) {
  const [lockedItem, setLockedItem] = useState<NavItem | null>(null);
  const access = getPlanAccess(plan);

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/profile", label: "Edit Profile", icon: UserCircle2 },
      {
        href: "/dashboard/listings",
        label: "Listings",
        icon: Home,
        locked: !access.properties && !isDeveloperView,
        unlockPlan: "GOLD",
      },
      {
        href: "/dashboard/leads",
        label: "Lead Logs",
        icon: FileText,
        locked: !access.leads && !isDeveloperView,
        unlockPlan: "GOLD",
      },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/integration", label: "API & Integration", icon: Puzzle },
      { href: "/dashboard/support", label: "Contact Support", icon: LifeBuoy },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    ],
    [access.leads, access.properties, isDeveloperView],
  );

  return (
    <>
      <nav className={mobile ? "mt-3 flex flex-wrap gap-2" : "space-y-1 p-4"}>
        {navItems.map((item) =>
          item.locked ? (
            <button
              key={item.href}
              type="button"
              onClick={() => setLockedItem(item)}
              className={
                mobile
                  ? "inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                  : "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
              }
            >
              <span className="inline-flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              <Lock className="h-3.5 w-3.5 text-amber-500" />
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={
                mobile
                  ? "rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                  : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ),
        )}
      </nav>

      {lockedItem && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Upgrade to Unlock
              </h2>
              <button
                type="button"
                onClick={() => setLockedItem(null)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              {lockedItem.label} is unavailable on your current plan. Upgrade to{" "}
              {lockedItem.unlockPlan} to unlock this capability.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLockedItem(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
              <Link
                href="/dashboard/billing"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                View Billing
              </Link>
              <a
                href={`/dashboard/billing/upgrade/${lockedItem.unlockPlan ?? "GOLD"}`}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Upgrade Now
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
