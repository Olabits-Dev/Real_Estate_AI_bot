"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Mail, Sparkles } from "lucide-react";
import RealEstateChat from "@/components/RealEstateChat";
import { buildQuickStarters } from "@/lib/quick-starters";
import {
  emailSnippetToDeveloper,
  scrapeAndConfigure,
} from "@/app/onboarding/actions";
import {
  initialEmailState,
  initialOnboardingState,
} from "@/app/onboarding/state";

export function LeadGenerationEngine() {
  const [onboardingState, onboardingAction, onboardingPending] = useActionState(
    scrapeAndConfigure,
    initialOnboardingState,
  );
  const [emailState, emailAction, emailPending] = useActionState(
    emailSnippetToDeveloper,
    initialEmailState,
  );

  const preview = onboardingState.preview;
  const siteMatchedStarterPrompts = preview
    ? buildQuickStarters({
        companyName: preview.companyName,
        properties: preview.sampleProperties,
      })
    : [];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Olabits Estate bot SaaS
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Automated Client Onboarding Engine
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
            Enter a real estate website URL and Olabits AI will scrape the
            brand, auto-configure a bot, and generate a live integration preview
            in seconds.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Open Dashboard
            </Link>
          </div>

          <form action={onboardingAction} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              name="websiteUrl"
              placeholder="Enter your website URL (e.g. house-search.ng)"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            />
            <button
              type="submit"
              disabled={onboardingPending}
              className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {onboardingPending ? "Scraping..." : "Scrape & Configure"}
            </button>
          </form>

          {onboardingPending && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Olabits AI is learning about your business...
            </p>
          )}

          {onboardingState.status === "error" && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {onboardingState.message}
            </p>
          )}

          {onboardingState.status === "success" && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {onboardingState.message}
            </p>
          )}
        </article>

        {preview && (
          <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-lg font-semibold text-slate-900">Live Demo</h2>
                <p className="text-sm text-slate-600">
                  Previewing {preview.companyName} with branded chatbot overlay.
                </p>
              </div>
              <div className="relative">
                <iframe
                  src={preview.websiteUrl}
                  title={`${preview.companyName} website preview`}
                  className="h-[68vh] w-full border-0"
                />
                <RealEstateChat
                  companyId={preview.companyId}
                  companyName={preview.companyName}
                  brandColor={preview.primaryColor}
                  starterPrompts={siteMatchedStarterPrompts}
                  isSubscribed
                  plan={preview.plan ?? "SILVER"}
                  previewPlan={preview.plan ?? "SILVER"}
                />
              </div>
            </article>

            <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Integration Ready
              </h3>
              {preview.logoUrl && (
                <img
                  src={preview.logoUrl}
                  alt={`${preview.companyName} logo`}
                  className="h-10 w-auto max-w-[180px] object-contain"
                />
              )}
              <p className="text-sm text-slate-600">
                Paste this code into your <code>&lt;body&gt;</code> tag:
              </p>

              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                {preview.snippet}
              </pre>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-600">Generated Public Key</p>
                <p className="mt-1 break-all text-sm text-slate-800">
                  {preview.companyPublicKey}
                </p>
              </div>

              {preview.sampleProperties.length > 0 && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">
                    Sample Scraped Listings
                  </p>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {preview.sampleProperties.map((item) => (
                      <li key={item.url} className="truncate">
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form action={emailAction} className="space-y-2">
                <input type="hidden" name="snippet" value={preview.snippet} />
                <input
                  type="hidden"
                  name="companyName"
                  value={preview.companyName}
                />
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">
                    Developer Email
                  </span>
                  <input
                    name="developerEmail"
                    type="email"
                    placeholder="developer@company.com"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={emailPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Mail className="h-4 w-4" />
                  {emailPending ? "Sending..." : "Email to my Developer"}
                </button>
              </form>

              {emailState.status !== "idle" && (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    emailState.status === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {emailState.message}
                </p>
              )}
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
