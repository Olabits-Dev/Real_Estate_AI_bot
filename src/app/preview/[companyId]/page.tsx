import { notFound } from "next/navigation";
import RealEstateChat from "@/components/RealEstateChat";
import { requireRole } from "@/lib/auth";
import { toBillingPlan } from "@/lib/billing-plan";
import { getPrismaClient } from "@/lib/prisma";
import { buildQuickStarters } from "@/lib/quick-starters";

function toWebsiteUrl(domainOrUrl: string) {
  const value = domainOrUrl.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default async function PublicCompanyPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("DEVELOPER");
  const { companyId } = await params;
  const query = await searchParams;
  const prisma = getPrismaClient();

  let company: Awaited<ReturnType<typeof prisma.company.findUnique>> = null;
  try {
    company = await prisma.company.findUnique({
      where: { id: companyId },
    });
  } catch (error) {
    console.error("Public preview company query failed:", error);
    notFound();
  }

  if (!company) {
    notFound();
  }

  const properties = await prisma.property.findMany({
    where: { companyId: company.id, isAvailable: true },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      title: true,
      location: true,
      propertyType: true,
    },
  });

  const starterPrompts = buildQuickStarters({
    companyName: company.name,
    primaryLocation: company.primaryLocation,
    properties,
  });
  const rawPreviewPlan =
    typeof query.plan === "string" ? query.plan : undefined;
  const previewPlan = toBillingPlan(rawPreviewPlan);

  const websiteUrl = toWebsiteUrl(company.authorizedDomain);

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">Live Property Assistant Preview</p>
          <h1 className="text-xl font-semibold text-slate-900">{company.name}</h1>
        </div>
        <div className="relative">
          {websiteUrl ? (
            <iframe
              src={websiteUrl}
              title={`${company.name} website`}
              className="h-[82vh] w-full border-0"
            />
          ) : (
            <div className="grid h-[82vh] place-items-center p-6 text-sm text-slate-600">
              No authorized domain is configured for this company.
            </div>
          )}
          <RealEstateChat
            companyId={company.id}
            companyName={company.name}
            starterPrompts={starterPrompts}
            isSubscribed={previewPlan ? true : company.isSubscribed}
            plan={previewPlan ?? company.plan}
            previewPlan={previewPlan}
          />
        </div>
      </section>
    </main>
  );
}
