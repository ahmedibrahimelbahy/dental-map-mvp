"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CallbackClient({
  code,
  next,
  oauthError,
}: {
  code: string | null;
  next: string;
  oauthError: string | null;
}) {
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Provider returned an error before code exchange
    if (oauthError) {
      setStatus("error");
      setErrorMsg(oauthError);
      return;
    }

    // No code — nothing to exchange. Bounce to /signin.
    if (!code) {
      window.location.assign("/en/signin?error=oauth_failed");
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setErrorMsg(error.message);
        // Auto-bounce after 2s so the user isn't stuck
        window.setTimeout(() => {
          window.location.assign("/en/signin?error=oauth_failed");
        }, 2000);
        return;
      }
      // Success — cookies are now in document.cookie. Hard-navigate so
      // the server-rendered shell sees the new session.
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      window.location.assign(safeNext);
    })();

    return () => {
      cancelled = true;
    };
  }, [code, next, oauthError]);

  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 24px",
        maxWidth: 380,
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 1px 2px rgba(15,19,32,0.04), 0 8px 28px -10px rgba(15,19,32,0.10)",
        border: "1px solid #EDEEF1",
      }}
    >
      {status === "working" ? (
        <>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#ECFEFA",
              color: "#0F766E",
              marginBottom: 16,
            }}
          >
            <Loader2 className="animate-spin" width={28} height={28} aria-hidden />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Signing you in…
          </h1>
          <p style={{ fontSize: 14, color: "#5F6776", lineHeight: 1.55, margin: 0 }}>
            Hang on a second — we&apos;re finishing up your Google sign-in.
          </p>
        </>
      ) : (
        <>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#FFE4E6",
              color: "#BE123C",
              fontSize: 24,
              marginBottom: 16,
            }}
          >
            ✗
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Sign-in failed
          </h1>
          <p style={{ fontSize: 13, color: "#5F6776", lineHeight: 1.55, marginBottom: 16 }}>
            {errorMsg ?? "We couldn't complete sign-in. Sending you back…"}
          </p>
          <a
            href="/en/signin"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              background: "#0D9488",
              color: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Back to sign in
          </a>
        </>
      )}
    </div>
  );
}
