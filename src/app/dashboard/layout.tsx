import { Building2 } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getDashboardCompany } from "@/lib/company-context";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthenticatedUser();
  const company = await getDashboardCompany();

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed top-0 left-0 hidden h-screen w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
          <Building2 className="h-6 w-6 text-blue-700" />
          <div>
            <p className="text-sm text-slate-500">Real Estate AI</p>
            <p className="font-semibold text-slate-900">Company Console</p>
          </div>
        </div>
        <SidebarNav plan={company?.plan} isDeveloperView={user.role === "DEVELOPER"} />
        <form action={logout} className="px-4 pt-2">
          <button
            type="submit"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </form>
      </aside>

      <header className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Company Console</p>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Logout
            </button>
          </form>
        </div>
        <SidebarNav
          plan={company?.plan}
          mobile
          isDeveloperView={user.role === "DEVELOPER"}
        />
      </header>

      <main className="px-4 py-6 lg:ml-72 lg:p-8">{children}</main>
      {user.role === "DEVELOPER" && (
        <a
          href="/developer"
          className="fixed right-4 bottom-4 z-50 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          Back to Developer Panel
        </a>
      )}
    </div>
  );
}
