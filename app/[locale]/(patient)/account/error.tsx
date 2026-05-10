"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/account] crashed:", error);
  }, [error]);

  return (
    <div className="max-w-[640px] mx-auto px-4 sm:px-5 md:px-8 py-12 md:py-16">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 md:p-8">
        <div className="flex items-start gap-3 mb-4">
          <span className="shrink-0 mt-0.5 text-rose-700">
            <AlertCircle className="w-6 h-6" aria-hidden />
          </span>
          <div>
            <h1 className="display-h2 text-[20px] md:text-[24px] text-ink-900 mb-2">
              Couldn&apos;t load your account
            </h1>
            <p className="text-[14px] leading-[1.6] text-ink-600">
              Something went wrong loading this page. The error has been logged
              — please share the message below with support so we can fix it
              fast.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white border border-rose-200 p-4 mb-4">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2">
            Error details
          </div>
          <code className="block text-[13px] text-ink-900 font-mono whitespace-pre-wrap break-all leading-[1.55]">
            {error.message || "Unknown error"}
          </code>
          {error.digest && (
            <div className="mt-3 pt-3 border-t border-rose-100 text-[11.5px] text-ink-500 font-mono break-all">
              digest: {error.digest}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="btn-primary inline-flex items-center gap-1.5 !text-[13px] !py-2 !px-4"
          >
            Try again
          </button>
          <Link
            href="/"
            className="btn-secondary inline-flex items-center gap-1.5 !text-[13px] !py-2 !px-4"
          >
            Back to home
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
          </Link>
        </div>

        <p className="text-[12px] text-ink-500 mt-4">
          Need to report this? Email{" "}
          <a href="mailto:support@dentalmap.app" className="link-teal">
            support@dentalmap.app
          </a>{" "}
          and include the error message above.
        </p>
      </div>
    </div>
  );
}
