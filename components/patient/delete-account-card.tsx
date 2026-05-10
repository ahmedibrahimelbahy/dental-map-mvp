"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteAccountAction } from "@/lib/auth/delete-account-action";

export function DeleteAccountCard({
  userEmail,
  labels,
}: {
  userEmail: string;
  labels: {
    title: string;
    body: string;
    button: string;
    confirmTitle: string;
    confirmBody: string;
    typeEmailLabel: string;
    confirmYes: string;
    confirmCancel: string;
    errorMismatch: string;
    errorServer: string;
    deleting: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === userEmail.toLowerCase();

  async function handleDelete() {
    setError(null);
    setBusy(true);
    const result = await deleteAccountAction(typed);
    if (!result.ok) {
      if (result.error === "email_mismatch") setError(labels.errorMismatch);
      else setError(result.message ?? labels.errorServer);
      setBusy(false);
      return;
    }
    // Account is gone. Sign out the local session (best-effort — the
    // user is already deleted on the server) and hard-reload.
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* the user is gone, signOut may fail; ignore */
    }
    window.location.assign("/");
  }

  return (
    <section className="mt-10 rounded-2xl border border-rose-200 bg-rose-50/40 p-5 md:p-6">
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 mt-0.5 text-rose-700">
          <AlertTriangle className="w-5 h-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[16px] md:text-[17px] font-bold text-ink-900 mb-1 leading-tight">
            {labels.title}
          </h2>
          <p className="text-[13.5px] leading-[1.65] text-ink-600">
            {labels.body}
          </p>
        </div>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
            setTyped("");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 text-rose-700 text-[13px] font-bold hover:bg-rose-100/70 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden />
          {labels.button}
        </button>
      ) : (
        <div className="rounded-xl border border-rose-300 bg-white p-4 mt-4">
          <div className="font-display text-[14.5px] font-bold text-ink-900 mb-2">
            {labels.confirmTitle}
          </div>
          <p className="text-[13px] leading-[1.65] text-ink-700 mb-4">
            {labels.confirmBody}
          </p>

          <label className="block">
            <span className="field-label">
              {labels.typeEmailLabel}{" "}
              <span className="text-rose-600 font-mono">{userEmail}</span>
            </span>
            <input
              type="email"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="field-input"
            />
          </label>

          {error && (
            <div className="mt-3 rounded-lg bg-rose-100 border border-rose-200 px-3 py-2 text-[12.5px] text-rose-800">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!matches || busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-bold transition-colors"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  {labels.deleting}
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  {labels.confirmYes}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-ink-200 text-ink-700 text-[13px] font-bold hover:bg-ink-50 transition-colors disabled:opacity-60"
            >
              {labels.confirmCancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
