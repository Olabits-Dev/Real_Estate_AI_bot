import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Olabits Estate Bot SaaS</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Client Dashboard Access
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Sign in to your real estate dashboard or create a new subscriber account.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Create Account
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Developer onboarding engine is available via developer login only.
        </p>
      </section>
    </main>
  );
}
