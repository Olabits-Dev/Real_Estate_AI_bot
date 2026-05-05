import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardCompany } from "@/lib/company-context";
import { getPlanAccess, hasAdvancedAnalytics } from "@/lib/plans";
import { getPrismaClient } from "@/lib/prisma";

type TrendMap = Record<string, number>;
type AnalyticsRow = {
  latestUserMessage: string;
  createdAt: Date;
};
type PropertyLocation = {
  location: string;
};

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function humanDay(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  const prisma = getPrismaClient();
  const session = await getCurrentSession();
  const company = await getDashboardCompany();

  if (!company) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">No Company Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create or select a company to view analytics.
        </p>
      </section>
    );
  }

  const access = getPlanAccess(company.plan);
  const developerOverride = session?.user.role === "DEVELOPER";
  const canViewAdvanced = hasAdvancedAnalytics(company.plan) || developerOverride;

  let totalConversations = 0;
  let analyticsRows: AnalyticsRow[] = [];
  let propertyLocations: PropertyLocation[] = [];
  let analyticsQueryFailed = false;
  try {
    [totalConversations, analyticsRows, propertyLocations] = await Promise.all([
      prisma.conversationAnalytics.count({
        where: { companyId: company.id },
      }),
      prisma.conversationAnalytics.findMany({
        where: { companyId: company.id },
        select: { latestUserMessage: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.property.findMany({
        where: { companyId: company.id },
        select: { location: true },
        distinct: ["location"],
        take: 12,
      }),
    ]);
  } catch (error) {
    analyticsQueryFailed = true;
    console.error("Analytics query failed:", error);
  }

  const locationNames = propertyLocations
    .map((item) => item.location.trim())
    .filter((value) => value.length > 0);

  const demandData = locationNames
    .map((location) => ({
      location,
      demand: analyticsRows.reduce((count, row) => {
        return row.latestUserMessage.toLowerCase().includes(location.toLowerCase())
          ? count + 1
          : count;
      }, 0),
    }))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 6);

  const today = new Date();
  const trendCounts: TrendMap = {};
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    trendCounts[formatDayKey(day)] = 0;
  }
  for (const row of analyticsRows) {
    const key = formatDayKey(row.createdAt);
    if (key in trendCounts) {
      trendCounts[key] += 1;
    }
  }

  const trendData = Object.entries(trendCounts).map(([date, leads]) => ({
    date: humanDay(date),
    leads,
  }));

  const fallbackDemand = [
    { location: company.primaryLocation, demand: 8 },
    { location: "Lekki", demand: 6 },
    { location: "Ikeja", demand: 4 },
  ];
  const fallbackTrend = trendData.map((point, index) => ({
    ...point,
    leads: Math.max(point.leads, index % 4),
  }));

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Analytics</p>
        <h1 className="text-2xl font-semibold text-slate-900">Performance Insights</h1>
        <p className="mt-1 text-sm text-slate-600">
          Plan: {company.plan ?? "SILVER"} • Analytics tier: {access.analytics}
        </p>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {analyticsQueryFailed && (
          <p className="mb-2 text-sm text-amber-700">
            Analytics data is temporarily unavailable. Showing fallback values.
          </p>
        )}
        <p className="text-sm text-slate-500">Total Conversations</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{totalConversations}</p>
      </article>

      {canViewAdvanced ? (
        <AnalyticsCharts
          demandData={demandData.length ? demandData : fallbackDemand}
          trendData={trendData}
        />
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="pointer-events-none opacity-70 blur-[2px]">
            <AnalyticsCharts demandData={fallbackDemand} trendData={fallbackTrend} />
          </div>
          <div className="absolute inset-0 grid place-items-center bg-white/30 backdrop-blur-sm">
            <div className="max-w-md rounded-xl border border-white/60 bg-white/90 p-5 text-center shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">
                Unlock Advanced Insights
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Demand by Location and Lead Trends are available on Platinum.
              </p>
              <a
                href="/dashboard/billing/upgrade/PLATINUM"
                className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Upgrade to Platinum
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
