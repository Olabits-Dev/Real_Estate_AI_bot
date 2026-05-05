import { updateCompanyProfile } from "@/app/dashboard/actions";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardCompany } from "@/lib/company-context";
import { getPlanAccess } from "@/lib/plans";

const personalities = [
  { value: "FRIENDLY", label: "Friendly" },
  { value: "LUXURY_FOCUSED", label: "Luxury-Focused" },
  { value: "DIRECT", label: "Direct" },
] as const;

export default async function CompanyProfilePage() {
  const session = await getCurrentSession();
  const company = await getDashboardCompany();

  if (!company) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">No Company Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a Company record first to configure profile settings.
        </p>
      </section>
    );
  }
  const access = getPlanAccess(company.plan);
  const developerOverride = session?.user.role === "DEVELOPER";

  return (
    <section className="max-w-3xl space-y-5">
      <div>
        <p className="text-sm text-slate-500">Company Profile</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Edit Company Profile
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Update your branding, routing domain, billing email, and assistant behavior.
        </p>
      </div>

      <form
        action={updateCompanyProfile}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="companyId" value={company.id} />
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Company Name</span>
            <input
              name="name"
              defaultValue={company.name}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              WhatsApp Number
            </span>
            <input
              name="whatsappNum"
              defaultValue={company.whatsappNum}
              disabled={!access.whatsapp && !developerOverride}
              title={
                access.whatsapp || developerOverride
                  ? undefined
                  : "WhatsApp lead routing is available on Gold and Platinum plans."
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              placeholder="2348012345678"
              required
            />
            {!access.whatsapp && !developerOverride && (
              <input type="hidden" name="whatsappNum" value={company.whatsappNum} />
            )}
            {!access.whatsapp && !developerOverride && (
              <span className="text-xs text-amber-700">
                WhatsApp lead routing is available on Gold and Platinum plans.
              </span>
            )}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              Primary Location
            </span>
            <input
              name="primaryLocation"
              defaultValue={company.primaryLocation}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              placeholder="Lekki Phase 1"
              required
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              Authorized Domain
            </span>
            <input
              name="authorizedDomain"
              defaultValue={company.authorizedDomain}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              placeholder="lekkihomes.ng"
              required
            />
            <span className="text-xs text-slate-500">
              Used for widget domain verification.
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              Billing Email
            </span>
            <input
              name="billingEmail"
              type="email"
              defaultValue={company.billingEmail ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              placeholder="billing@company.com"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              AI Personality
            </span>
            <select
              name="aiPersonality"
              defaultValue={company.aiPersonality}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            >
              {personalities.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Public Widget Key</span>
            <input
              value={company.publicKey}
              readOnly
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Save Profile
        </button>
      </form>
    </section>
  );
}
