"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DebugInfo = {
  step: string;
  hasCode: boolean;
  codeLength: number;
  hasVerifierCookie: boolean | string; // "unknown" if reading is restricted
  cookieKeys: string[];
  exchangeError?: { message: string; status?: number; name?: string };
  url: string;
};

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
  const [debug, setDebug] = useState<DebugInfo | null>(null);

  useEffect(() => {
    const cookieJar = typeof document !== "undefined" ? document.cookie : "";
    const cookieKeys = cookieJar
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter(Boolean);
    const baseDebug: DebugInfo = {
      step: "init",
      hasCode: !!code,
      codeLength: code?.length ?? 0,
      hasVerifierCookie: cookieKeys.some((k) => k.endsWith("auth-token-code-verifier")),
      cookieKeys,
      url: typeof window !== "undefined" ? window.location.href : "ssr",
    };

    if (oauthError) {
      setStatus("error");
      setErrorMsg(`OAuth provider error: ${oauthError}`);
      setDebug({ ...baseDebug, step: "provider-error" });
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMsg("No authorization code in callback URL.");
      setDebug({ ...baseDebug, step: "no-code" });
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (error) {
        const errInfo = {
          message: error.message,
          status: (error as { status?: number }).status,
          name: error.name,
        };
        setStatus("error");
        setErrorMsg(error.message);
        setDebug({ ...baseDebug, step: "exchange-failed", exchangeError: errInfo });
        return;
      }

      // Success — cookies in document.cookie. Hard-navigate.
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
        padding: "28px 22px",
        maxWidth: 460,
        width: "100%",
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
              fontWeight: 700,
            }}
          >
            ✗
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Sign-in failed
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#5F6776",
              lineHeight: 1.55,
              marginBottom: 14,
              wordBreak: "break-word",
            }}
          >
            <strong style={{ color: "#BE123C" }}>{errorMsg}</strong>
          </p>

          {debug && (
            <details
              style={{
                textAlign: "start",
                background: "#F7F8F9",
                border: "1px solid #EDEEF1",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 14,
                fontSize: 12,
                lineHeight: 1.55,
                color: "#2F3645",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "#454C5C",
                }}
              >
                🛠 Debug info — screenshot this and send it to Ahmed
              </summary>
              <DebugRow label="step" value={debug.step} />
              <DebugRow label="has code in url" value={String(debug.hasCode)} />
              <DebugRow label="code length" value={String(debug.codeLength)} />
              <DebugRow
                label="verifier cookie present"
                value={String(debug.hasVerifierCookie)}
              />
              <DebugRow
                label="cookie names"
                value={debug.cookieKeys.length ? debug.cookieKeys.join(", ") : "(none)"}
                wrap
              />
              {debug.exchangeError && (
                <>
                  <DebugRow
                    label="exchange error name"
                    value={debug.exchangeError.name ?? "(none)"}
                  />
                  <DebugRow
                    label="exchange error status"
                    value={String(debug.exchangeError.status ?? "(none)")}
                  />
                  <DebugRow
                    label="exchange error msg"
                    value={debug.exchangeError.message}
                    wrap
                  />
                </>
              )}
              <DebugRow label="url" value={debug.url} wrap />
            </details>
          )}

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

function DebugRow({
  label,
  value,
  wrap = false,
}: {
  label: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "3px 0",
        borderBottom: "1px dashed #EDEEF1",
      }}
    >
      <span style={{ minWidth: 130, color: "#5F6776" }}>{label}</span>
      <span
        style={{
          flex: 1,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 11.5,
          wordBreak: wrap ? "break-all" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
