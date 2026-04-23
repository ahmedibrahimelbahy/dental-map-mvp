import { Link } from "@/i18n/routing";
import { Construction, ArrowLeft } from "lucide-react";

export function PlaceholderPage({
  label,
  title,
  body,
  eta,
}: {
  label: string;
  title: string;
  body: string;
  eta: string;
}) {
  return (
    <div className="max-w-[860px] mx-auto px-5 md:px-8 py-20 md:py-32">
      <span className="chip mb-6">
        <span className="chip-dot"></span>
        {label}
      </span>
      <h1 className="display-h1 text-[40px] md:text-[60px] text-ink-900 mb-5">
        {title}
      </h1>
      <p className="text-[17px] leading-[1.6] text-ink-500 max-w-[56ch]">
        {body}
      </p>
      <div className="mt-8 flex items-center gap-3 text-[13.5px] text-ink-600">
        <Construction className="w-4 h-4 text-teal-500" aria-hidden />
        <span>
          <span className="font-semibold text-ink-700">ETA:</span> {eta}
        </span>
      </div>
      <Link href="/" className="mt-12 btn-secondary">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />
        Back to home
      </Link>
    </div>
  );
}
