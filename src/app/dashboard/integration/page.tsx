import { WidgetLoaderGenerator } from "@/components/dashboard/widget-loader-generator";
import {
  rotateCompanyDataSourceKey,
  syncPropertiesNow,
  updateCompanyDataSource,
} from "@/app/dashboard/actions";
import { getDashboardCompany } from "@/lib/company-context";
import { getRuntimeAppBaseUrl } from "@/lib/app-url";

export default async function IntegrationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const syncStatus = typeof params.sync === "string" ? params.sync : "";
  const syncCount = typeof params.count === "string" ? params.count : "";
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

      {syncStatus === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Property sync completed successfully. {syncCount ? `${syncCount} listing(s) processed.` : ""}
        </div>
      )}
      {syncStatus === "failed" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Property sync failed. Check endpoint response and try again.
        </div>
      )}
      {syncStatus === "in_progress" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A sync is already running. Wait a moment and retry.
        </div>
      )}
      {syncStatus === "missing_endpoint" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add a data source endpoint before running sync.
        </div>
      )}
      {syncStatus === "invalid_endpoint" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Invalid endpoint URL. Use a valid http(s) URL.
        </div>
      )}
      {syncStatus === "key_rotated" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Data source API key rotated successfully.
        </div>
      )}
      {syncStatus === "config_saved" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Data source endpoint saved.
        </div>
      )}
      {syncStatus === "config_cleared" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Data source endpoint removed.
        </div>
      )}

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

      <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Client Data Source</h2>
          <p className="mt-1 text-sm text-slate-600">
            Sync client property records into Olabits so the AI responds with live inventory.
          </p>
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">Sync Ingest Endpoint</span>
          <input
            readOnly
            value={`${baseUrl}/api/sync/properties`}
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">Source API Key</span>
          <input
            readOnly
            value={company.dataSourceApiKey}
            className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
          />
        </label>

        <form action={rotateCompanyDataSourceKey}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Rotate Source API Key
          </button>
        </form>

        <form action={updateCompanyDataSource} className="space-y-2">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              Source Feed URL (for Sync Now)
            </span>
            <input
              name="dataSourceEndpoint"
              defaultValue={company.dataSourceEndpoint ?? ""}
              placeholder="https://client-domain.com/api/properties-feed"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Save Data Source Endpoint
          </button>
        </form>

        <form action={syncPropertiesNow}>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sync Now
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            Last Sync Status:{" "}
            <span className="font-semibold">
              {company.dataSourceLastSyncStatus ?? "IDLE"}
            </span>
          </p>
          <p>
            Last Sync Time:{" "}
            <span className="font-semibold">
              {company.dataSourceLastSyncedAt
                ? company.dataSourceLastSyncedAt.toLocaleString()
                : "Never"}
            </span>
          </p>
          <p>
            Last Synced Count:{" "}
            <span className="font-semibold">
              {company.dataSourceLastSyncedCount ?? 0}
            </span>
          </p>
          {company.dataSourceLastSyncMessage && (
            <p className="mt-1 text-xs text-slate-600">{company.dataSourceLastSyncMessage}</p>
          )}
        </div>
      </article>
    </section>
  );
}
