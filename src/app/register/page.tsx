import Link from "next/link";
import { registerSubscriber } from "@/app/auth/actions";

export default function SubscriberRegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Subscriber Onboarding</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Create Your Real Estate Dashboard
        </h1>
        <form action={registerSubscriber} className="mt-5 grid gap-3 md:grid-cols-2">
          <input
            name="fullName"
            placeholder="Full name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
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
          <input
            name="companyName"
            placeholder="Company name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
          <input
            name="whatsappNum"
            placeholder="WhatsApp number (e.g. 2348012345678)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
          <input
            name="primaryLocation"
            placeholder="Primary location"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
          <input
            name="authorizedDomain"
            placeholder="Authorized domain (e.g. myrealty.com)"
            className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
          <button
            type="submit"
            className="md:col-span-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Create Subscriber Account
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-700">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
