import { loginDeveloper } from "@/app/auth/actions";

function resolveErrorMessage(error: string | string[] | undefined) {
  const value = Array.isArray(error) ? error[0] : error;
  if (value === "invalid_credentials") return "Invalid developer email or password.";
  if (value === "missing_fields") return "Please fill in email and password.";
  if (value === "service_unavailable") {
    return "Login is temporarily unavailable. Please try again shortly.";
  }
  return "";
}

export default async function DeveloperLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const errorMessage = resolveErrorMessage(params.error);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-sm">
        <p className="text-sm text-slate-400">Olabits Developer Login</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">
          Olabits Estate Bot Admin
        </h1>
        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-amber-300/40 bg-amber-100/10 px-3 py-2 text-sm text-amber-200">
            {errorMessage}
          </p>
        ) : null}
        <form action={loginDeveloper} className="mt-5 grid gap-3">
          <input
            name="email"
            type="email"
            placeholder="Developer email"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-blue-500 focus:ring-2"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-blue-500 focus:ring-2"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Login as Developer
          </button>
        </form>
      </section>
    </main>
  );
}
