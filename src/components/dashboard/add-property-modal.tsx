"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createProperty } from "@/app/dashboard/actions";

type AddPropertyModalProps = {
  companyId: string;
};

export function AddPropertyModal({ companyId }: AddPropertyModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
      >
        <Plus className="h-4 w-4" />
        Add Property
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add Property</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await createProperty(formData);
                setOpen(false);
              }}
              className="grid gap-3"
            >
              <input type="hidden" name="companyId" value={companyId} />

              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Title</span>
                <input
                  name="title"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Location</span>
                <input
                  name="location"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Price</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  name="description"
                  rows={3}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">
                  Document Type
                </span>
                <input
                  name="documentType"
                  placeholder="C of O"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                  required
                />
              </label>

              <button
                type="submit"
                className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Save Property
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
