import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CookieClientCheck } from "./client-check";

export const dynamic = "force-dynamic";

/**
 * Diagnostic page — shows what the server sees and what the browser
 * can do. Used to debug the stubborn "sign-in works on desktop, broken
 * on mobile" bug after 4 server-side fixes failed to move the needle.
 */
export default async function AuthDebugPage() {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const supabase = await createClient();

  const ua = headerStore.get("user-agent") ?? "unknown";
  const allCookies = cookieStore.getAll();

  const supaCookies = allCookies.filter((c) => c.name.startsWith("sb-"));
  const otherCookies = allCookies.filter((c) => !c.name.startsWith("sb-"));

  let userInfo: string;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) userInfo = "ERROR — " + error.message;
    else if (!data.user) userInfo = "NULL — server sees no user";
    else userInfo = `OK — ${data.user.email}`;
  } catch (e) {
    userInfo = "THREW — " + String(e);
  }

  const isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  const isMobile = /Mobile|iPhone|iPad|Android/i.test(ua);

  return (
    <div
      style={{
        fontFamily: "-apple-system, system-ui, sans-serif",
        padding: 16,
        maxWidth: 640,
        margin: "0 auto",
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
        🔍 Auth Diagnostic
      </h1>

      <p
        style={{
          fontSize: 13,
          color: "#5F6776",
          marginBottom: 18,
          padding: "8px 12px",
          background: "#FEF3C7",
          border: "1px solid #FDE68A",
          borderRadius: 8,
        }}
      >
        <strong>Send Ahmed a screenshot of this whole page.</strong> Run this on
        the device that&apos;s broken (your phone) AND on a working device (laptop)
        if possible — comparing the two will pin the bug.
      </p>

      <Verdict
        userInfo={userInfo}
        sbCount={supaCookies.length}
      />

      <Section title="🔐 Server saw">
        <Row label="getUser() result" value={userInfo} mono />
      </Section>

      <Section title={`🍪 Server got ${allCookies.length} cookies (${supaCookies.length} are sb-*)`}>
        {allCookies.length === 0 ? (
          <Bad>
            ZERO cookies. Browser sent nothing. This means the browser is
            either blocking cookies entirely OR the cookies the server sent
            on the previous request never made it into storage.
          </Bad>
        ) : (
          <>
            {supaCookies.length > 0 ? (
              supaCookies.map((c) => (
                <Row key={c.name} label={c.name} value={`${c.value.length} chars`} mono />
              ))
            ) : (
              <Bad>
                No <code>sb-*</code> cookies. Other cookies work but Supabase
                auth cookies are missing or rejected. Possibly chunked-cookie
                size issue, SameSite, or browser-specific quirk.
              </Bad>
            )}
            {otherCookies.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "#5F6776" }}>
                  Other cookies ({otherCookies.length})
                </summary>
                <div style={{ marginTop: 6 }}>
                  {otherCookies.map((c) => (
                    <Row key={c.name} label={c.name} value={`${c.value.length} chars`} mono />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </Section>

      <Section title="📱 Device">
        <Row label="Apple device?" value={isApple ? "yes" : "no"} />
        <Row label="Safari engine?" value={isSafari ? "yes" : "no (Chrome/Firefox/wrapper)"} />
        <Row label="Mobile UA?" value={isMobile ? "yes" : "no"} />
        <Row label="User-Agent" value={ua} mono />
      </Section>

      <CookieClientCheck />

      <Section title="🛠 What to try if cookies are blocked on iOS Safari">
        <ol style={{ paddingInlineStart: 22, fontSize: 13, lineHeight: 1.7 }}>
          <li>Open Settings → Safari (the iOS app, not the browser)</li>
          <li>Find &quot;Block All Cookies&quot; — make sure it&apos;s OFF</li>
          <li>Find &quot;Prevent Cross-Site Tracking&quot; — try turning it OFF temporarily and retest</li>
          <li>Go to Settings → Safari → Advanced → Website Data → search dentalmap.app → swipe to delete</li>
          <li>Open Safari, go to dentalmap.app, retry sign-in</li>
        </ol>
      </Section>

      <Section title="🛠 What to try if you&apos;re on Chrome / Firefox / Brave on iOS">
        <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          All iOS browsers wrap Safari&apos;s WebKit, so the same iOS Safari
          settings apply. Try the steps above. Brave additionally has a Shields
          panel — try turning Shields OFF for dentalmap.app.
        </p>
      </Section>
    </div>
  );
}

function Verdict({
  userInfo,
  sbCount,
}: {
  userInfo: string;
  sbCount: number;
}) {
  const isOk = userInfo.startsWith("OK");
  if (isOk) {
    return (
      <div
        style={{
          padding: "10px 14px",
          marginBottom: 16,
          background: "#D1FAE5",
          border: "1px solid #6EE7B7",
          color: "#065F46",
          borderRadius: 8,
          fontWeight: 600,
        }}
      >
        ✓ Server sees you signed in. If the app still shows Sign Up, the bug
        is in the rendered header on this device — refresh hard or check
        DevTools.
      </div>
    );
  }
  if (sbCount === 0) {
    return (
      <div
        style={{
          padding: "10px 14px",
          marginBottom: 16,
          background: "#FFE4E6",
          border: "1px solid #FCA5A5",
          color: "#7F1D1D",
          borderRadius: 8,
          fontWeight: 600,
        }}
      >
        ✗ Server sees ZERO Supabase cookies. The browser is not sending
        them. Try the iOS Safari fixes below or use a different browser to
        confirm whether it&apos;s device-wide.
      </div>
    );
  }
  return (
    <div
      style={{
        padding: "10px 14px",
        marginBottom: 16,
        background: "#FEF3C7",
        border: "1px solid #FCD34D",
        color: "#78350F",
        borderRadius: 8,
        fontWeight: 600,
      }}
    >
      ⚠ Server got cookies but couldn&apos;t resolve a user. Token might be
      malformed or expired. Sign out, sign in fresh, retest.
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
      <div style={{ minWidth: 130, color: "#5F6776", fontWeight: 500 }}>
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

function Bad({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#FFE4E6",
        padding: "10px 12px",
        borderRadius: 6,
        color: "#7F1D1D",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}
