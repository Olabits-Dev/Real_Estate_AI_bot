import { logout } from "@/app/auth/actions";
import { openClientWorkspace } from "@/app/developer/actions";
import { requireRole } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export default async function DeveloperDashboardPage() {
  const prisma = getPrismaClient();
  await requireRole("DEVELOPER");

  let companies: Awaited<ReturnType<typeof prisma.company.findMany>> = [];
  let users: Awaited<ReturnType<typeof prisma.user.findMany>> = [];
  let dataQueryFailed = false;
  try {
    [companies, users] = await Promise.all([
      prisma.company.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.user.findMany({
        where: { role: "SUBSCRIBER" },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);
  } catch (error) {
    dataQueryFailed = true;
    console.error("Developer dashboard query failed:", error);
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Olabits AI Bot Developer</p>
            <h1 className="text-3xl font-semibold">Full Admin Control</h1>
            {dataQueryFailed && (
              <p className="mt-2 text-sm text-amber-300">
                Data service is temporarily unavailable. Retry in a moment.
              </p>
            )}
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Logout
            </button>
          </form>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">Recent Subscribers</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {users.map((user) => (
                <li key={user.id} className="rounded-md bg-slate-800 px-3 py-2">
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-slate-400">{user.email}</p>
                </li>
              ))}
              {users.length === 0 && <li className="text-slate-400">No subscribers yet.</li>}
            </ul>
          </article>

          <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">Recent Companies</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {companies.map((company) => (
                <li key={company.id} className="rounded-md bg-slate-800 px-3 py-2">
                  <p className="font-medium">{company.name}</p>
                  <p className="text-slate-400">
                    Plan: {company.plan ?? "SILVER"} • Active:{" "}
                    {company.isSubscribed ? "Yes" : "No"}
                  </p>
                  <form action={openClientWorkspace} className="mt-2">
                    <input type="hidden" name="companyId" value={company.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                    >
                      Open Client Dashboard
                    </button>
                  </form>
                </li>
              ))}
              {companies.length === 0 && <li className="text-slate-400">No companies yet.</li>}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
