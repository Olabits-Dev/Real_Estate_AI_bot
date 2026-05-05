import { loginSubscriber } from "@/app/auth/actions";
import Link from "next/link";

function resolveErrorMessage(error: string | string[] | undefined) {
  const value = Array.isArray(error) ? error[0] : error;
  if (value === "invalid_credentials") return "Invalid email or password.";
  if (value === "missing_fields") return "Please fill in email and password.";
  if (value === "service_unavailable") {
    return "Login is temporarily unavailable. Please try again shortly.";
  }
  return "";
}

export default async function SubscriberLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const errorMessage = resolveErrorMessage(params.error);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Subscriber Login</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Real Estate Client Dashboard
        </h1>
        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {errorMessage}
          </p>
        ) : null}
        <form action={loginSubscriber} className="mt-5 grid gap-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          New subscriber?{" "}
          <Link href="/register" className="font-semibold text-blue-700">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
