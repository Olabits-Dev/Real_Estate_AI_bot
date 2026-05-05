import { WidgetLoaderGenerator } from "@/components/dashboard/widget-loader-generator";
import { getDashboardCompany } from "@/lib/company-context";
import { getRuntimeAppBaseUrl } from "@/lib/app-url";

export default async function IntegrationPage() {
  const company = await getDashboardCompany();
  const baseUrl = await getRuntimeAppBaseUrl();

  if (!company) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">No Company Found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a Company record to generate API credentials and widget script.
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-4xl space-y-5">
      <div>
        <p className="text-sm text-slate-500">API & Integration</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Embed the Chat Widget
        </h1>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-sm text-slate-600">
          Use your public key and snippet below to embed the chatbot on your
          website. Requests are protected with domain whitelisting against your
          authorized domain.
        </p>

        <div className="space-y-3">
          <WidgetLoaderGenerator publicKey={company.publicKey} baseUrl={baseUrl} />
        </div>
      </article>
    </section>
  );
}
