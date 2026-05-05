import { getDashboardCompany } from "@/lib/company-context";
import { getCurrentSession } from "@/lib/auth";
import { getPlanAccess } from "@/lib/plans";
import { getPrismaClient } from "@/lib/prisma";

export default async function LeadLogsPage() {
  const prisma = getPrismaClient();
  const session = await getCurrentSession();
  const company = await getDashboardCompany();

  if (!company) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">No Company Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create or select a company to view lead logs.
        </p>
      </section>
    );
  }

  const access = getPlanAccess(company.plan);

  const developerOverride = session?.user.role === "DEVELOPER";

  if (!access.leads && !developerOverride) {
    return (
      <section className="space-y-5">
        <div>
          <p className="text-sm text-slate-500">Lead Logs</p>
          <h1 className="text-2xl font-semibold text-slate-900">Lead Conversations</h1>
        </div>
        <article className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Feature Unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">
            Upgrade to Gold to unlock lead logs and customer conversation history.
          </p>
          <a
            href="/dashboard/billing/upgrade/GOLD"
            className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Upgrade to Gold
          </a>
        </article>
      </section>
    );
  }

  let logs: Awaited<ReturnType<typeof prisma.conversationAnalytics.findMany>> = [];
  let leadsQueryFailed = false;
  try {
    logs = await prisma.conversationAnalytics.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch (error) {
    leadsQueryFailed = true;
    console.error("Lead logs query failed:", error);
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">Lead Logs</p>
        <h1 className="text-2xl font-semibold text-slate-900">Lead Conversations</h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {leadsQueryFailed && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Lead logs are temporarily unavailable. Please retry shortly.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Latest User Message</th>
                <th className="px-4 py-3 font-medium">Messages</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 text-slate-700">
                    {log.createdAt.toLocaleString("en-NG")}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{log.latestUserMessage}</td>
                  <td className="px-4 py-3 text-slate-700">{log.totalMessageCount}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                    No lead logs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
