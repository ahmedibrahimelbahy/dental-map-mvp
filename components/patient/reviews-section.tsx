import { Star, ShieldCheck } from "lucide-react";
import { listReviewsForDentist, getReviewStats } from "@/lib/reviews/list";

type Labels = {
  sectionTitle: string;
  avgRating: (avg: number) => string;
  verifiedCount: (count: number) => string;
  emptyTitle: string;
  emptyBody: string;
  verifiedPatient: string;
};

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          strokeWidth={1.5}
          className={
            n <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-ink-200"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

function formatMonthYear(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    month: "short",
    year: "numeric",
    timeZone: "Africa/Cairo",
  });
}

export async function ReviewsSection({
  dentistId,
  locale,
  labels,
}: {
  dentistId: string;
  locale: string;
  labels: Labels;
}) {
  const isAr = locale === "ar";
  const [reviews, stats] = await Promise.all([
    listReviewsForDentist(dentistId, 20),
    getReviewStats(dentistId),
  ]);

  return (
    <section aria-labelledby="reviews-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h2
          id="reviews-heading"
          className="display-h2 text-[22px] md:text-[26px] text-ink-900"
        >
          {labels.sectionTitle}
        </h2>
        {stats.count > 0 && (
          <div className="flex items-center gap-2">
            <Star
              className="w-5 h-5 fill-amber-400 text-amber-400"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="font-display text-[18px] font-bold text-ink-900 leading-none">
              {stats.avg.toFixed(1)}
            </span>
            <span className="text-[12.5px] text-ink-500">
              {labels.avgRating(stats.avg)}
            </span>
            <span className="text-ink-300 text-[12.5px]">·</span>
            <span className="text-[12.5px] text-ink-600 font-semibold">
              {labels.verifiedCount(stats.count)}
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 md:p-8 text-center shadow-card">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-ink-50 grid place-items-center">
            <Star
              className="w-5 h-5 text-ink-300"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
          <h3 className="font-display text-[18px] font-bold text-ink-900 mb-1">
            {labels.emptyTitle}
          </h3>
          <p className="text-[13.5px] text-ink-500 max-w-[42ch] mx-auto leading-relaxed">
            {labels.emptyBody}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => {
            // Show comment in current locale, fall back to the other.
            const primary = isAr ? r.commentAr : r.commentEn;
            const fallback = isAr ? r.commentEn : r.commentAr;
            const comment = primary ?? fallback ?? null;

            return (
              <li
                key={r.id}
                className="rounded-2xl border border-ink-100 bg-white p-4 md:p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 grid place-items-center font-bold text-[13.5px] shrink-0">
                      {r.patientFirstName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-[14px] text-ink-900 leading-tight truncate">
                        {r.patientFirstName}
                      </div>
                      <div className="flex items-center gap-1 text-[11.5px] text-teal-700 mt-0.5">
                        <ShieldCheck className="w-3 h-3" aria-hidden />
                        <span className="font-semibold">
                          {labels.verifiedPatient}
                        </span>
                        <span className="text-ink-300">·</span>
                        <span className="text-ink-500 font-normal">
                          {formatMonthYear(r.publishedAtIso, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <StarRow rating={r.rating} />
                </div>
                {comment && (
                  <p className="text-[14px] leading-[1.7] text-ink-700 mt-2 whitespace-pre-line">
                    {comment}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
