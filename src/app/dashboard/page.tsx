import Link from "next/link";
import { Building2, Home, MapPin, MessageCircle } from "lucide-react";
import { getDashboardCompany } from "@/lib/company-context";
import { getPlanAccess } from "@/lib/plans";
import { getPrismaClient } from "@/lib/prisma";

function statCard(label: string, value: string, icon: React.ReactNode) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

export default async function DashboardOverviewPage() {
  const prisma = getPrismaClient();
  const company = await getDashboardCompany();

  if (!company) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">No Company Assigned</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your subscriber account is not yet linked to a company workspace.
        </p>
      </section>
    );
  }

  const access = getPlanAccess(company.plan);

  let propertyCount = 0;
  let availableCount = 0;
  try {
    [propertyCount, availableCount] = await Promise.all([
      prisma.property.count({
        where: { companyId: company.id },
      }),
      prisma.property.count({
        where: { companyId: company.id, isAvailable: true },
      }),
    ]);
  } catch (error) {
    console.error("Overview stats query failed:", error);
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Overview</p>
        <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Plan: {company.plan ?? "SILVER"} •{" "}
          {company.isSubscribed ? "Subscription Active" : "Subscription Inactive"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/preview/${company.id}`}
            className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Open Live Preview
          </Link>
          {!company.isSubscribed && (
            <a
              href="/dashboard/billing/upgrade/GOLD"
              className="inline-flex rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800"
            >
              Upgrade Subscription
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCard("Total Listings", String(propertyCount), <Home className="h-4 w-4" />)}
        {statCard(
          "Available Listings",
          String(availableCount),
          <Building2 className="h-4 w-4" />,
        )}
        {statCard("Primary Location", company.primaryLocation, <MapPin className="h-4 w-4" />)}
        {statCard("Lead WhatsApp", company.whatsappNum, <MessageCircle className="h-4 w-4" />)}
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Plan Capabilities</h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-700">
          <li>Property Inventory: {access.properties ? "Enabled" : "Locked"}</li>
          <li>Lead Logs: {access.leads ? "Enabled" : "Locked"}</li>
          <li>Analytics: {access.analytics === "advanced" ? "Advanced" : "Basic"}</li>
          <li>WhatsApp Routing: {access.whatsapp ? "Enabled" : "Locked"}</li>
        </ul>
      </article>
    </section>
  );
}
