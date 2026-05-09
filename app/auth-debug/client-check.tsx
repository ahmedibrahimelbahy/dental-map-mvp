"use client";

import { useEffect, useState } from "react";

/**
 * Browser-side diagnostic. Tests if the user's browser actually allows
 * setting and reading a cookie via document.cookie. If not, the whole
 * auth flow is doomed regardless of what the server sends.
 */
export function CookieClientCheck() {
  const [report, setReport] = useState<{
    cookieEnabledFlag: boolean;
    canWrite: boolean;
    canReadBack: boolean;
    storageOk: boolean;
    storageError: string | null;
    privateMode: string;
  } | null>(null);

  useEffect(() => {
    const cookieEnabledFlag = navigator.cookieEnabled;
    const TEST = "__dm_test_" + Date.now();
    document.cookie = `${TEST}=1; Path=/; Max-Age=60; SameSite=Lax`;
    const cookieJar = document.cookie;
    const canWrite = true;
    const canReadBack = cookieJar.includes(`${TEST}=1`);
    // Clean up the test cookie
    document.cookie = `${TEST}=; Path=/; Max-Age=0`;

    let storageOk = false;
    let storageError: string | null = null;
    try {
      localStorage.setItem("__dm_test", "1");
      const v = localStorage.getItem("__dm_test");
      storageOk = v === "1";
      localStorage.removeItem("__dm_test");
    } catch (e) {
      storageError = String(e);
    }

    // Detect private/incognito (Safari raises QuotaExceededError on storage in some private modes)
    const privateMode = storageError?.includes("Quota") ? "likely yes" : "no signal";

    setReport({
      cookieEnabledFlag,
      canWrite,
      canReadBack,
      storageOk,
      storageError,
      privateMode,
    });
  }, []);

  return (
    <div
      style={{
        marginBottom: 14,
        padding: "10px 12px",
        background: "#F7F8F9",
        border: "1px solid #EDEEF1",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#5F6776",
          marginBottom: 8,
        }}
      >
        🌐 Browser diagnostics
      </div>
      {!report ? (
        <div style={{ fontSize: 13, color: "#5F6776" }}>Running…</div>
      ) : (
        <>
          {!report.canReadBack && (
            <div
              style={{
                background: "#FFE4E6",
                padding: "10px 12px",
                borderRadius: 6,
                color: "#7F1D1D",
                fontSize: 13,
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              ✗ <strong>This browser is BLOCKING cookies.</strong> Wrote a test
              cookie but couldn&apos;t read it back. Sign-in cannot work
              regardless of any server fix until cookies are enabled. Check
              your privacy/cookie settings.
            </div>
          )}
          {report.canReadBack && (
            <div
              style={{
                background: "#D1FAE5",
                padding: "8px 12px",
                borderRadius: 6,
                color: "#065F46",
                fontSize: 13,
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              ✓ Cookies work in this browser (write + read-back ok).
            </div>
          )}
          <Row label="navigator.cookieEnabled" value={String(report.cookieEnabledFlag)} />
          <Row label="document.cookie write" value={String(report.canWrite)} />
          <Row label="document.cookie read-back" value={String(report.canReadBack)} />
          <Row label="localStorage works" value={String(report.storageOk)} />
          {report.storageError && (
            <Row label="storage error" value={report.storageError} mono />
          )}
          <Row label="private mode (guess)" value={report.privateMode} />
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "4px 0",
        borderBottom: "1px dashed #EDEEF1",
        fontSize: 13,
      }}
    >
      <div style={{ minWidth: 170, color: "#5F6776", fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          flex: 1,
          wordBreak: "break-all",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, monospace" : undefined,
          fontSize: mono ? 12 : 13,
        }}
      >
        {value}
      </div>
    </div>
  );
}
