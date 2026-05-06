"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { startGoogleOAuth } from "@/lib/auth/oauth-action";

export function GoogleSignInButton({
  locale,
  label,
  next,
}: {
  locale: string;
  label: string;
  next?: string;
}) {
  return (
    <form action={startGoogleOAuth.bind(null, locale, next)}>
      <SubmitButton label={label} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-ink-200 bg-white text-ink-800 font-semibold text-[14.5px] hover:bg-ink-50 active:bg-ink-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      style={{ minHeight: 48 }}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        <GoogleLogo />
      )}
      <span>{label}</span>
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
