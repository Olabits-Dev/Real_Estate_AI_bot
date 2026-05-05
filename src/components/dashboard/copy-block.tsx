"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyBlockProps = {
  label: string;
  value: string;
  multiline?: boolean;
};

export function CopyBlock({ label, value, multiline = false }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-medium text-slate-600">{label}</p>
      <div className="flex items-start justify-between gap-2">
        <pre
          className={`whitespace-pre-wrap break-all text-xs text-slate-800 ${
            multiline ? "max-w-[92%]" : "truncate"
          }`}
        >
          {value}
        </pre>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
          className="rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:bg-slate-100"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
