"use client";

import { useState } from "react";
import { Check, Copy, Edit3, Trash2, X } from "lucide-react";
import Link from "next/link";
import {
  deleteCompany,
  switchDashboardCompany,
  updateCompanyById,
} from "@/app/dashboard/actions";

type CompanyRowActionsProps = {
  company: {
    id: string;
    name: string;
    slug: string;
    whatsappNum: string;
    primaryLocation: string;
    authorizedDomain: string;
    aiPersonality: "FRIENDLY" | "LUXURY_FOCUSED" | "DIRECT";
  };
  isActive: boolean;
};

export function CompanyRowActions({ company, isActive }: CompanyRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function getPublicBaseUrl() {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configured) {
      const withProtocol = /^https?:\/\//i.test(configured)
        ? configured
        : `https://${configured}`;
      return withProtocol.replace(/\/+$/g, "");
    }
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }

  async function copyTextToClipboard(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    if (typeof document === "undefined") return false;

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    const copiedWithFallback = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copiedWithFallback;
  }

  async function copyPreviewLink() {
    const path = `/preview/${company.id}`;
    const baseUrl = getPublicBaseUrl();
    const absoluteUrl = baseUrl ? `${baseUrl}${path}` : path;

    try {
      const didCopy = await copyTextToClipboard(absoluteUrl);
      if (!didCopy) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Copy preview link failed:", error);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/preview/${company.id}`}
          className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          Live Preview
        </Link>

        <button
          type="button"
          onClick={copyPreviewLink}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Share Link"}
        </button>

        <form action={switchDashboardCompany}>
          <input type="hidden" name="companyId" value={company.id} />
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              isActive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {isActive ? "Active" : "Use"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </button>

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Company
              </h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close edit modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await updateCompanyById(formData);
                setEditOpen(false);
              }}
              className="grid gap-3"
            >
              <input type="hidden" name="companyId" value={company.id} />

              <input
                name="name"
                defaultValue={company.name}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                required
              />
              <input
                name="whatsappNum"
                defaultValue={company.whatsappNum}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                required
              />
              <input
                name="primaryLocation"
                defaultValue={company.primaryLocation}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                required
              />
              <input
                name="authorizedDomain"
                defaultValue={company.authorizedDomain}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                required
              />
              <select
                name="aiPersonality"
                defaultValue={company.aiPersonality}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              >
                <option value="FRIENDLY">Friendly</option>
                <option value="LUXURY_FOCUSED">Luxury-Focused</option>
                <option value="DIRECT">Direct</option>
              </select>

              <button
                type="submit"
                className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Delete Company
              </h2>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close delete modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              This will permanently remove <strong>{company.name}</strong> and
              all its properties. To confirm, type the company name exactly.
            </p>

            <form
              action={async (formData) => {
                await deleteCompany(formData);
                setDeleteOpen(false);
              }}
              className="mt-4 grid gap-3"
            >
              <input type="hidden" name="companyId" value={company.id} />
              <input
                name="confirmName"
                placeholder={company.name}
                className="rounded-lg border border-rose-300 px-3 py-2 text-sm outline-none ring-rose-500 focus:ring-2"
                required
              />
              <button
                type="submit"
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                Delete Company
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
