"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { CalendarDays, CircleCheck, Loader2 } from "lucide-react";

export function GcalConnectionCard({
  dentistId,
  connected,
  googleCalendarId,
  lastSyncedAt,
  locale,
  t,
}: {
  dentistId: string | null;
  connected: boolean;
  googleCalendarId: string | null;
  lastSyncedAt: string | null;
  locale: string;
  t: {
    explainTitle: string;
    explainBody: string;
    connected: string;
    notConnected: string;
    connect: string;
    disconnect: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onConnect = () => {
    if (!dentistId) return;
    window.location.href = `/api/gcal/oauth/start?dentistId=${dentistId}&locale=${locale}`;
  };

  const onDisconnect = () => {
    if (!dentistId) return;
    startTransition(async () => {
      await fetch("/api/gcal/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentistId, locale }),
      });
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 md:p-7 shadow-card">
      <div className="flex items-start gap-4 mb-5">
        <span className="w-11 h-11 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-[20px] md:text-[22px] font-bold text-ink-900 mb-1">
            {t.explainTitle}
          </h2>
          <p className="text-[14px] leading-[1.6] text-ink-500 max-w-[62ch]">
            {t.explainBody}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-[13.5px]">
          {connected ? (
            <>
              <CircleCheck className="w-4 h-4 text-teal-500" aria-hidden />
              <span className="font-semibold text-teal-700">{t.connected}</span>
              {googleCalendarId && (
                <span className="text-ink-500">
                  · <code className="font-mono text-[12px]">{googleCalendarId}</code>
                </span>
              )}
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-coral-500" />
              <span className="font-semibold text-ink-700">{t.notConnected}</span>
            </>
          )}
        </div>

        <div className="ms-auto flex items-center gap-3">
          {connected ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={pending || !dentistId}
              className="btn-secondary text-[13px] !py-2 !px-4 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {pending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  {t.disconnect}
                </>
              ) : (
                t.disconnect
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={!dentistId}
              className="btn-primary text-[13.5px] !py-2.5 !px-5 disabled:opacity-60"
            >
              {t.connect}
            </button>
          )}
        </div>
      </div>

      {lastSyncedAt && (
        <div className="mt-4 text-[12px] text-ink-400">
          Last sync: {new Date(lastSyncedAt).toLocaleString()}
        </div>
      )}
    </section>
  );
}
