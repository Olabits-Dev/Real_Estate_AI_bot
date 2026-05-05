import { AddPropertyModal } from "@/components/dashboard/add-property-modal";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardCompany } from "@/lib/company-context";
import { getPlanAccess } from "@/lib/plans";
import { getPrismaClient } from "@/lib/prisma";

function currency(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

export default async function ListingsPage() {
  const prisma = getPrismaClient();
  const session = await getCurrentSession();
  const company = await getDashboardCompany();

  if (!company) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">No Company Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add a Company record before managing listings.
        </p>
      </section>
    );
  }
  const access = getPlanAccess(company.plan);

  const developerOverride = session?.user.role === "DEVELOPER";

  if (!access.properties && !developerOverride) {
    return (
      <section className="space-y-5">
        <div>
          <p className="text-sm text-slate-500">Listings</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Property Management
          </h1>
        </div>
        <article className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Feature Unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">
            Upgrade to Gold to start managing your property inventory.
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

  let properties: Awaited<ReturnType<typeof prisma.property.findMany>> = [];
  try {
    properties = await prisma.property.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Listings query failed:", error);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Listings</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Property Management
          </h1>
        </div>
        <AddPropertyModal companyId={company.id} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Document Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-900">{property.title}</td>
                  <td className="px-4 py-3 text-slate-700">{property.location}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {currency(property.price)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {property.propertyType}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        property.isAvailable
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {property.isAvailable ? "Available" : "Not Available"}
                    </span>
                  </td>
                </tr>
              ))}
              {properties.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No properties yet. Add your first listing.
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
