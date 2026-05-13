"use client";

import { useTransition } from "react";
import { Check, X, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  approveClinicAction,
  denyClinicAction,
  togglePublishAction,
} from "@/lib/ops/actions";

export function ClinicRowActions({
  clinicId,
  verificationStatus,
  isPublished,
  isAr,
}: {
  clinicId: string;
  verificationStatus: "pending" | "approved" | "denied";
  isPublished: boolean;
  isAr: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {verificationStatus === "pending" && (
        <>
          <ActionButton
            tone="approve"
            disabled={pending}
            onClick={() => run(() => approveClinicAction(clinicId))}
            icon={<Check className="w-3.5 h-3.5" />}
            label={isAr ? "وافق" : "Approve"}
          />
          <ActionButton
            tone="deny"
            disabled={pending}
            onClick={() => run(() => denyClinicAction(clinicId))}
            icon={<X className="w-3.5 h-3.5" />}
            label={isAr ? "ارفض" : "Deny"}
          />
        </>
      )}
      {verificationStatus === "approved" && (
        <ActionButton
          tone={isPublished ? "neutral" : "approve"}
          disabled={pending}
          onClick={() => run(() => togglePublishAction(clinicId, !isPublished))}
          icon={
            isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />
          }
          label={
            isPublished
              ? isAr ? "إخفاء" : "Unpublish"
              : isAr ? "انشر" : "Publish"
          }
        />
      )}
      {verificationStatus === "denied" && (
        <ActionButton
          tone="approve"
          disabled={pending}
          onClick={() => run(() => approveClinicAction(clinicId))}
          icon={<Check className="w-3.5 h-3.5" />}
          label={isAr ? "أعد الموافقة" : "Re-approve"}
        />
      )}
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-400 ms-1" aria-hidden />}
    </div>
  );
}

function ActionButton({
  tone,
  disabled,
  onClick,
  icon,
  label,
}: {
  tone: "approve" | "deny" | "neutral";
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const cls =
    tone === "approve"
      ? "bg-teal-600 text-white hover:bg-teal-700 border-teal-600"
      : tone === "deny"
        ? "bg-rose-600 text-white hover:bg-rose-700 border-rose-600"
        : "bg-white text-ink-700 hover:bg-ink-50 border-ink-200";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[12px] font-bold transition-colors disabled:opacity-60 ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}
