"use client";

import { useState } from "react";
import { useTransition } from "react";
import { Pencil, Check, X, Loader2, Lock, KeyRound } from "lucide-react";
import { PhoneInput } from "@/components/auth/phone-input";
import {
  updateProfileAction,
  changePasswordAction,
} from "@/lib/auth/profile-actions";

export type AccountSettingsLabels = {
  title: string;
  nameField: string;
  phoneField: string;
  emailField: string;
  emailReadOnlyHint: string;
  passwordField: string;
  edit: string;
  save: string;
  saving: string;
  saved: string;
  cancel: string;
  changePassword: string;
  currentPassword: string;
  newPassword: string;
  newPasswordHint: string;
  confirmNewPassword: string;
  passwordsMismatch: string;
  passwordChanged: string;
  invalidName: string;
  invalidPhone: string;
};

export function AccountSettingsCard({
  initialFullName,
  initialPhone,
  email,
  locale,
  labels,
}: {
  initialFullName: string;
  initialPhone: string;
  email: string;
  locale: string;
  labels: AccountSettingsLabels;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [draftName, setDraftName] = useState(initialFullName);
  const [draftPhone, setDraftPhone] = useState(initialPhone);
  const [pendingName, startNameTransition] = useTransition();
  const [pendingPhone, startPhoneTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState<null | "name" | "phone">(null);
  const [fieldError, setFieldError] = useState<{ field: string; msg: string } | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);

  function saveName() {
    if (!draftName.trim()) {
      setFieldError({ field: "name", msg: labels.invalidName });
      return;
    }
    setFieldError(null);
    startNameTransition(async () => {
      const r = await updateProfileAction({ fullName: draftName.trim() });
      if (!r.ok) {
        setFieldError({ field: "name", msg: r.error });
        return;
      }
      setFullName(draftName.trim());
      setEditingName(false);
      setSavedFlash("name");
      setTimeout(() => setSavedFlash(null), 1800);
    });
  }

  function savePhone() {
    if (!draftPhone.trim()) {
      setFieldError({ field: "phone", msg: labels.invalidPhone });
      return;
    }
    setFieldError(null);
    startPhoneTransition(async () => {
      const r = await updateProfileAction({ phone: draftPhone.trim() });
      if (!r.ok) {
        setFieldError({ field: "phone", msg: r.error });
        return;
      }
      setPhone(draftPhone.trim());
      setEditingPhone(false);
      setSavedFlash("phone");
      setTimeout(() => setSavedFlash(null), 1800);
    });
  }

  return (
    <section className="rounded-2xl border border-ink-100 bg-white shadow-card p-5 md:p-6 mb-6">
      <h2 className="small-caps text-ink-400 mb-4">{labels.title}</h2>

      <div className="divide-y divide-ink-100">
        {/* ── Name ─────────────────────────────────────────────── */}
        <FieldRow
          label={labels.nameField}
          editing={editingName}
          editLabel={labels.edit}
          cancelLabel={labels.cancel}
          saveLabel={pendingName ? labels.saving : labels.save}
          savedFlash={savedFlash === "name" ? labels.saved : null}
          onEdit={() => {
            setDraftName(fullName);
            setEditingName(true);
            setEditingPhone(false);
            setFieldError(null);
          }}
          onCancel={() => {
            setEditingName(false);
            setFieldError(null);
          }}
          onSave={saveName}
          saveDisabled={pendingName || !draftName.trim()}
          error={fieldError?.field === "name" ? fieldError.msg : null}
          view={
            <span className="text-[14px] text-ink-900 font-medium">
              {fullName || "—"}
            </span>
          }
          edit={
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoFocus
              className="field-input"
            />
          }
        />

        {/* ── Phone ────────────────────────────────────────────── */}
        <FieldRow
          label={labels.phoneField}
          editing={editingPhone}
          editLabel={labels.edit}
          cancelLabel={labels.cancel}
          saveLabel={pendingPhone ? labels.saving : labels.save}
          savedFlash={savedFlash === "phone" ? labels.saved : null}
          onEdit={() => {
            setDraftPhone(phone);
            setEditingPhone(true);
            setEditingName(false);
            setFieldError(null);
          }}
          onCancel={() => {
            setEditingPhone(false);
            setFieldError(null);
          }}
          onSave={savePhone}
          saveDisabled={pendingPhone || !draftPhone.trim()}
          error={fieldError?.field === "phone" ? fieldError.msg : null}
          view={
            <span className="text-[14px] text-ink-900 font-medium" dir="ltr">
              {phone || "—"}
            </span>
          }
          edit={
            <PhoneInput
              value={draftPhone}
              onChange={setDraftPhone}
              locale={locale}
              required
            />
          }
        />

        {/* ── Email (read-only) ────────────────────────────────── */}
        <div className="py-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="field-label text-ink-500 mb-1">
              {labels.emailField}
            </div>
            <div className="text-[14px] text-ink-700 font-medium truncate" dir="ltr">
              {email}
            </div>
            <div className="text-[12px] text-ink-400 mt-1">
              {labels.emailReadOnlyHint}
            </div>
          </div>
          <Lock className="w-4 h-4 text-ink-300 shrink-0" aria-hidden />
        </div>

        {/* ── Password ─────────────────────────────────────────── */}
        <div className="py-3">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="min-w-0 flex-1">
              <div className="field-label text-ink-500 mb-1">
                {labels.passwordField}
              </div>
              <div className="text-[14px] text-ink-900 font-mono tracking-widest">
                ••••••••
              </div>
            </div>
            {!passwordOpen && (
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-ink-700 text-[12.5px] font-semibold hover:bg-ink-50 transition-colors shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" aria-hidden />
                {labels.changePassword}
              </button>
            )}
          </div>

          {passwordOpen && (
            <PasswordChangePanel
              labels={labels}
              onClose={() => setPasswordOpen(false)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function FieldRow({
  label,
  editing,
  editLabel,
  cancelLabel,
  saveLabel,
  savedFlash,
  onEdit,
  onCancel,
  onSave,
  saveDisabled,
  error,
  view,
  edit,
}: {
  label: string;
  editing: boolean;
  editLabel: string;
  cancelLabel: string;
  saveLabel: string;
  savedFlash: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  error: string | null;
  view: React.ReactNode;
  edit: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4 mb-1">
        <div className="field-label text-ink-500">{label}</div>
        {savedFlash && (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 font-bold">
            <Check className="w-3.5 h-3.5" aria-hidden />
            {savedFlash}
          </span>
        )}
      </div>

      {editing ? (
        <div>
          <div className="mb-2">{edit}</div>
          {error && (
            <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-1.5 text-[12px] text-rose-800 mb-2">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12.5px] font-bold transition-colors"
            >
              {saveDisabled && saveLabel.toLowerCase().includes("…") ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="w-3.5 h-3.5" aria-hidden />
              )}
              {saveLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saveDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-ink-700 text-[12.5px] font-semibold hover:bg-ink-50 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
              {cancelLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">{view}</div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-ink-500 text-[12px] font-semibold hover:bg-ink-50 hover:text-teal-700 transition-colors shrink-0"
          >
            <Pencil className="w-3 h-3" aria-hidden />
            {editLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function PasswordChangePanel({
  labels,
  onClose,
}: {
  labels: AccountSettingsLabels;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError(labels.passwordsMismatch);
      return;
    }
    startTransition(async () => {
      const r = await changePasswordAction({
        currentPassword: current,
        newPassword: next,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    });
  }

  if (success) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-[13px] text-emerald-800 font-medium flex items-center gap-2">
        <Check className="w-4 h-4" aria-hidden />
        {labels.passwordChanged}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl bg-ink-50/60 border border-ink-100 p-4 space-y-3">
      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-[12.5px] text-rose-800">
          {error}
        </div>
      )}

      <div>
        <label className="field-label text-[11.5px]">{labels.currentPassword}</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className="field-input !text-[14px]"
        />
      </div>
      <div>
        <label className="field-label text-[11.5px]">{labels.newPassword}</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="field-input !text-[14px]"
        />
        <p className="mt-1 text-[11.5px] text-ink-500">{labels.newPasswordHint}</p>
      </div>
      <div>
        <label className="field-label text-[11.5px]">{labels.confirmNewPassword}</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="field-input !text-[14px]"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12.5px] font-bold transition-colors"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="w-3.5 h-3.5" aria-hidden />
          )}
          {labels.save}
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrent("");
            setNext("");
            setConfirm("");
            setError(null);
            onClose();
          }}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-ink-700 text-[12.5px] font-semibold hover:bg-ink-50 transition-colors disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
          {labels.cancel}
        </button>
      </div>
    </form>
  );
}
