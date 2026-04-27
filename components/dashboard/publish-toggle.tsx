"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { setClinicPublishedAction } from "@/lib/auth/dentist-actions";
import { Eye, EyeOff } from "lucide-react";

export function PublishToggle({
  clinicId,
  initialPublished,
  t,
}: {
  clinicId: string;
  initialPublished: boolean;
  t: { title: string; body: string; on: string; off: string };
}) {
  const [optimistic, setOptimistic] = useState(initialPublished);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () => {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      try {
        await setClinicPublishedAction({ clinicId, published: next });
        router.refresh();
      } catch {
        setOptimistic(!next);
      }
    });
  };

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="flex items-start gap-3">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            optimistic
              ? "bg-teal-500 text-white"
              : "bg-ink-50 text-ink-500 border border-ink-100"
          }`}
        >
          {optimistic ? (
            <Eye className="w-5 h-5" aria-hidden />
          ) : (
            <EyeOff className="w-5 h-5" aria-hidden />
          )}
        </span>
        <div>
          <h3 className="font-display text-[17px] font-bold text-ink-900 mb-0.5">
            {t.title}
          </h3>
          <p className="text-[13.5px] text-ink-500 max-w-[60ch]">{t.body}</p>
          <div className="mt-2 text-[12.5px] font-semibold">
            {optimistic ? (
              <span className="text-teal-700">● {t.on}</span>
            ) : (
              <span className="text-ink-500">○ {t.off}</span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        onClick={toggle}
        disabled={pending}
        className={`shrink-0 relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 ${
          optimistic ? "bg-teal-500" : "bg-ink-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-card transition-transform ${
            optimistic ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"
          }`}
        />
      </button>
    </section>
  );
}
