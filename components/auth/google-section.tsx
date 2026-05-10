"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { GoogleSignInButton } from "./google-sign-in-button";

type Detection = {
  detected: boolean;
  isAppleWebkit: boolean;
};

/**
 * Wraps the Google sign-in button + the "or continue with" divider.
 *
 * iOS Safari's ITP (Intelligent Tracking Prevention) clears cookies
 * across the OAuth redirect chain (dentalmap.app → supabase.co →
 * google.com → supabase.co → dentalmap.app). The verifier cookie set
 * before the chain is gone by the time the user comes back, and
 * Supabase's state cookie on its own subdomain gets cleared too. Net
 * result: Google sign-in silently fails on Safari (private OR normal).
 *
 * This is an Apple-side limitation. Until we add Apple Sign In or
 * magic-link auth, we hide the Google button on Safari and show a
 * note pointing the user at email/password instead.
 *
 * Detection runs client-side because the Apple WebKit User-Agent is
 * preserved in iOS Chrome / Firefox / Brave / Edge — they all use
 * WebKit under the hood on iOS, so the same ITP behaviour applies.
 */
export function GoogleSection({
  locale,
  label,
  orContinueWith,
  next,
  safariNote,
}: {
  locale: string;
  label: string;
  orContinueWith: string;
  next?: string;
  safariNote: string;
}) {
  const [det, setDet] = useState<Detection>({
    detected: false,
    isAppleWebkit: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    // iPhone / iPad / iPod / Mac Safari → all on WebKit + ITP. Detect
    // by the fact that they're on Apple platform AND not Chrome on Mac
    // (Chrome on Mac ships its own Blink engine and isn't subject to
    // this ITP behaviour).
    const isIosLike = /iPhone|iPad|iPod/.test(ua);
    const isMacSafari =
      /Macintosh/.test(ua) &&
      /Safari/.test(ua) &&
      !/Chrome|CriOS|FxiOS|EdgiOS|Edg\//.test(ua);
    setDet({ detected: true, isAppleWebkit: isIosLike || isMacSafari });
  }, []);

  // While detection is running (first render), render NOTHING for the
  // OAuth section to avoid a flash of the button. Detection completes
  // before paint in practice.
  if (!det.detected) {
    return (
      <div
        className="my-6 flex items-center gap-4 text-[12px] text-ink-400"
        role="separator"
        aria-label={orContinueWith}
      >
        <span className="h-px flex-1 bg-ink-100" />
        <span className="uppercase tracking-smallcaps">{orContinueWith}</span>
        <span className="h-px flex-1 bg-ink-100" />
      </div>
    );
  }

  if (det.isAppleWebkit) {
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6 text-[12.5px] leading-[1.55] text-amber-900 flex gap-2.5"
        role="note"
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" aria-hidden />
        <span>{safariNote}</span>
      </div>
    );
  }

  return (
    <>
      <GoogleSignInButton locale={locale} label={label} next={next} />
      <div
        className="my-6 flex items-center gap-4 text-[12px] text-ink-400"
        role="separator"
        aria-label={orContinueWith}
      >
        <span className="h-px flex-1 bg-ink-100" />
        <span className="uppercase tracking-smallcaps">{orContinueWith}</span>
        <span className="h-px flex-1 bg-ink-100" />
      </div>
    </>
  );
}
