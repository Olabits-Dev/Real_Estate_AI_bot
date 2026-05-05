import { Mail, Phone } from "lucide-react";

const supportEmail = "atilolasamuel15@gmail.com";
const supportPhoneDisplay = "08035208600";
const supportPhoneIntl = "+2348035208600";

export default function SupportPage() {
  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-slate-500">Support</p>
        <h1 className="text-2xl font-semibold text-slate-900">Contact Developer</h1>
        <p className="mt-1 text-sm text-slate-600">
          If you face any challenge with your AI bot or dashboard, contact support directly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${supportEmail}`}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-slate-500">Email Support</p>
              <p className="mt-1 font-medium text-slate-900">{supportEmail}</p>
              <p className="mt-2 text-xs text-slate-500">Tap to open your mail app</p>
            </div>
          </div>
        </a>

        <a
          href={`tel:${supportPhoneIntl}`}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-slate-500">Phone Support</p>
              <p className="mt-1 font-medium text-slate-900">{supportPhoneDisplay}</p>
              <p className="mt-2 text-xs text-slate-500">Tap to call support directly</p>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
