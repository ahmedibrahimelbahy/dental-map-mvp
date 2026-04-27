"use client";

import { useState } from "react";
import { Phone, MessageCircle, ClipboardCopy, Check } from "lucide-react";

type Props = {
  patientName: string;
  patientPhone: string;
  slotStart: string;
  slotEnd: string;
  feeEgp: number;
  note: string | null;
  t: { copy: string; copied: string; call: string; whatsapp: string };
};

export function BookingRowActions({
  patientName,
  patientPhone,
  slotStart,
  slotEnd,
  feeEgp,
  note,
  t,
}: Props) {
  const [copied, setCopied] = useState(false);

  const phoneDigits = patientPhone.replace(/[^0-9+]/g, "");

  const formatted = [
    `Patient: ${patientName}`,
    `Phone:   ${patientPhone}`,
    `When:    ${new Date(slotStart).toLocaleString()}  →  ${new Date(slotEnd).toLocaleString()}`,
    `Fee:     ${feeEgp} EGP`,
    note ? `Note:    ${note}` : null,
    "",
    "(via Dental Map)",
  ]
    .filter(Boolean)
    .join("\n");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onCopy}
        className="btn-secondary !py-1.5 !px-3 !text-[12.5px]"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" aria-hidden />
        ) : (
          <ClipboardCopy className="w-3.5 h-3.5" aria-hidden />
        )}
        {copied ? t.copied : t.copy}
      </button>
      <a
        href={`tel:${phoneDigits}`}
        className="btn-ghost !py-1.5 !px-3 !text-[12.5px]"
      >
        <Phone className="w-3.5 h-3.5" aria-hidden />
        {t.call}
      </a>
      <a
        href={`https://wa.me/${phoneDigits.replace(/^\+/, "")}`}
        target="_blank"
        rel="noopener"
        className="btn-ghost !py-1.5 !px-3 !text-[12.5px]"
      >
        <MessageCircle className="w-3.5 h-3.5" aria-hidden />
        {t.whatsapp}
      </a>
    </div>
  );
}
