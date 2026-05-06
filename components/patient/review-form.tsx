"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { submitReviewAction } from "@/lib/reviews/actions";

const MIN_COMMENT = 10;
const MAX_COMMENT = 500;

export function ReviewForm({
  appointmentId,
  locale,
  onSuccess,
}: {
  appointmentId: string;
  locale: string;
  /** Called after successful submit so the parent can re-render. */
  onSuccess?: (reviewId: string, rating: number) => void;
}) {
  const t = useTranslations("Reviews");
  const isAr = locale === "ar";

  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError(t("ratingLabel"));
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_COMMENT) {
      setError(
        isAr
          ? `التعليق لازم يكون على الأقل ${MIN_COMMENT} حرف`
          : `Comment must be at least ${MIN_COMMENT} characters`
      );
      return;
    }
    if (trimmed.length > MAX_COMMENT) {
      setError(
        isAr
          ? `التعليق أقصاه ${MAX_COMMENT} حرف`
          : `Comment is capped at ${MAX_COMMENT} characters`
      );
      return;
    }

    startTransition(async () => {
      const res = await submitReviewAction({
        appointmentId,
        rating,
        commentAr: isAr ? trimmed || null : null,
        commentEn: !isAr ? trimmed || null : null,
      });
      if (res.ok) {
        setSuccess(true);
        onSuccess?.(res.reviewId, rating);
        return;
      }
      switch (res.error) {
        case "already_reviewed":
          setError(t("errorAlreadyReviewed"));
          break;
        case "not_completed":
          setError(t("errorNotCompleted"));
          break;
        case "not_authenticated":
          window.location.href = `/${locale}/signin`;
          return;
        default:
          setError(t("errorServer"));
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" aria-hidden />
        <div>
          <div className="font-bold text-[14px] text-ink-900">
            {t("successTitle")}
          </div>
          <p className="text-[13px] text-ink-700 leading-relaxed mt-1">
            {t("successBody")}
          </p>
        </div>
      </div>
    );
  }

  const displayed = hover || rating;

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-ink-100 bg-ink-50/40 p-4 space-y-4"
    >
      <div>
        <div className="font-display text-[16px] font-bold text-ink-900 mb-1">
          {t("formTitle")}
        </div>
      </div>

      <div>
        <div className="text-[12px] font-bold uppercase tracking-wider text-ink-500 mb-2">
          {t("ratingLabel")}
        </div>
        <div
          role="radiogroup"
          aria-label={t("ratingLabel")}
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= displayed;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(0)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setRating(Math.min(5, (rating || 0) + 1));
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                    e.preventDefault();
                    setRating(Math.max(1, (rating || 1) - 1));
                  }
                }}
                className="p-1 -m-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-7 h-7 ${
                    filled
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-ink-300"
                  }`}
                  strokeWidth={1.5}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor={`review-comment-${appointmentId}`}
          className="block text-[12px] font-bold uppercase tracking-wider text-ink-500 mb-2"
        >
          {t("commentLabel")}
        </label>
        <textarea
          id={`review-comment-${appointmentId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={MAX_COMMENT}
          placeholder={t("commentPlaceholder")}
          className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-300 resize-none"
        />
        <div className="text-[11px] text-ink-400 mt-1 text-end">
          {comment.length}/{MAX_COMMENT}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || rating === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-[13.5px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
          {pending ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
