import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Diagnostic page — shows what the server actually sees from the
 * user's browser. Used to debug auth-state-not-persisting issues
 * across desktop vs mobile.
 *
 * NOT linked anywhere in the UI — accessed directly at /auth-debug.
 * Safe to leave in: only shows cookie names + sizes, never values.
 */
export default async function AuthDebugPage() {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const supabase = await createClient();

  const ua = headerStore.get("user-agent") ?? "unknown";
  const allCookies = cookieStore.getAll();

  const supaCookies = allCookies.filter((c) => c.name.startsWith("sb-"));
  const otherCookies = allCookies.filter((c) => !c.name.startsWith("sb-"));

  // Try to resolve the user
  let userInfo: string;
  let getUserError: string | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      getUserError = error.message;
      userInfo = "ERROR — " + error.message;
    } else if (!data.user) {
      userInfo = "NULL — no user (cookies missing or invalid)";
    } else {
      userInfo = `OK — ${data.user.email} (id: ${data.user.id.slice(0, 8)}…)`;
    }
  } catch (e) {
    getUserError = String(e);
    userInfo = "THREW — " + String(e);
  }

  const isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  const isMobile = /Mobile|iPhone|iPad|Android/i.test(ua);

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "20px",
        maxWidth: "640px",
        margin: "0 auto",
        fontSize: "14px",
        lineHeight: 1.55,
      }}
    >
      <h1
        style={{
          fontSize: "20px",
          fontWeight: 700,
          marginBottom: "16px",
        }}
      >
        Auth Diagnostic
      </h1>

      <div style={{ marginBottom: 24 }}>
        <strong>Server time:</strong> {new Date().toISOString()}
      </div>

      <Section title="Auth state">
        <Row label="getUser() result" value={userInfo} />
        {getUserError && <Row label="error" value={getUserError} mono />}
      </Section>

      <Section title="Browser">
        <Row label="User-Agent" value={ua} mono />
        <Row label="Apple device?" value={isApple ? "yes" : "no"} />
        <Row label="Safari?" value={isSafari ? "yes" : "no (or wrapper)"} />
        <Row label="Mobile?" value={isMobile ? "yes" : "no"} />
      </Section>

      <Section title={`Supabase cookies (${supaCookies.length})`}>
        {supaCookies.length === 0 ? (
          <div
            style={{
              background: "#FEF3C7",
              padding: "10px 12px",
              borderRadius: 6,
              color: "#78350F",
            }}
          >
            <strong>No sb-* cookies found.</strong> The browser isn&apos;t
            sending Supabase auth cookies for this request — either they were
            never set, were rejected by the browser, or were stripped by an
            intermediate proxy.
          </div>
        ) : (
          supaCookies.map((c) => (
            <Row
              key={c.name}
              label={c.name}
              value={`${c.value.length} chars`}
              mono
            />
          ))
        )}
      </Section>

      <Section title={`Other cookies (${otherCookies.length})`}>
        {otherCookies.length === 0 ? (
          <em>none</em>
        ) : (
          otherCookies.map((c) => (
            <Row
              key={c.name}
              label={c.name}
              value={`${c.value.length} chars`}
              mono
            />
          ))
        )}
      </Section>

      <div
        style={{
          marginTop: 24,
          padding: "12px 14px",
          background: "#F0FDFA",
          border: "1px solid #99F6E4",
          borderRadius: 8,
          fontSize: 12.5,
          color: "#0F766E",
        }}
      >
        <strong>How to use:</strong> Sign in. Land back on home. Then open
        this page directly. If <em>Auth state</em> shows OK on this page but
        the header still shows Sign Up, the bug is in the header render. If{" "}
        <em>Auth state</em> shows NULL with zero sb-* cookies, the bug is in
        cookie storage — the browser isn&apos;t saving the cookies the server
        sent.
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: 18,
        padding: "12px 14px",
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
        {title}
      </div>
      <div>{children}</div>
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
      <div
        style={{
          minWidth: 130,
          color: "#5F6776",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          wordBreak: "break-all",
          fontFamily: mono
            ? "ui-monospace, SFMono-Regular, monospace"
            : undefined,
          fontSize: mono ? 12 : 13,
        }}
      >
        {value}
      </div>
    </div>
  );
}
