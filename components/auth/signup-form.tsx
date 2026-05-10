"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { signUpAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { PhoneInput } from "./phone-input";

export function SignUpForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // E.164-ish: "+201012345678"
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanEmail || !cleanName || !cleanPhone || !password) {
      setError(t("requiredFields"));
      setBusy(false);
      return;
    }
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      setBusy(false);
      return;
    }

    const sendFd = new FormData();
    sendFd.set("locale", locale);
    sendFd.set("email", cleanEmail);
    sendFd.set("password", password);
    sendFd.set("fullName", cleanName);
    sendFd.set("phone", cleanPhone);

    const created = await signUpAction(undefined, sendFd);
    if (!created.ok) {
      const msg = created.error.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        setError(t("emailAlreadyTaken"));
      } else if (created.field === "phone" || msg.includes("phone")) {
        setError(t("phoneInvalid"));
      } else {
        setError(created.error);
      }
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (signInErr) {
      window.location.assign(`/${locale}/signin`);
      return;
    }

    window.location.assign(`/${locale}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div className="rounded-lg border border-coral-500/40 bg-coral-100/60 px-4 py-3 text-[13.5px] text-ink-900">
          {error}
        </div>
      )}

      <Field id="fullName" label={t("fullName")} required>
        <input
          id="fullName"
          type="text"
          name="fullName"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="field-input"
        />
      </Field>

      <Field id="email" label={t("email")} required>
        <input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input"
        />
      </Field>

      <Field id="phone" label={t("phone")} required hint={t("phoneHint")}>
        <PhoneInput
          id="phone"
          name="phone"
          value={phone}
          onChange={setPhone}
          locale={locale}
          required
        />
      </Field>

      <Field id="password" label={t("password")} required hint={t("passwordHint")}>
        <input
          id="password"
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input"
        />
      </Field>

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
        {t("submitSignUp")}
      </button>

      <div className="mt-10 text-[14px] text-ink-500 text-center">
        {t("haveAccount")}{" "}
        <Link href="/signin" className="link-teal">
          {t("linkSignIn")}
        </Link>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label inline-flex items-center gap-1">
        {label}
        {required && (
          <span className="text-rose-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p className="mt-2 text-[12.5px] text-ink-500 leading-[1.5]">{hint}</p>
      )}
    </div>
  );
}
