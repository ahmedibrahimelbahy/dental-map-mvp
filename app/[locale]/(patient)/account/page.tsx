import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { listPatientBookings } from "@/lib/patient/bookings";
import { getPatientReviewMap } from "@/lib/reviews/list";
import { AccountBookings } from "@/components/patient/account-bookings";
import { User } from "lucide-react";
import type { PatientBooking } from "@/lib/patient/bookings";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const t = await getTranslations("Account");
  const tr = await getTranslations("Reviews");
  const [bookings, reviewsByAppt] = await Promise.all([
    listPatientBookings(user.id),
    getPatientReviewMap(user.id),
  ]);

  const statusLabels: Record<PatientBooking["status"], string> = {
    pending: t("statusPending"),
    confirmed: t("statusConfirmed"),
    completed: t("statusCompleted"),
    cancelled: t("statusCancelled"),
    no_show: t("statusNoShow"),
  };

  const errorMessages = {
    not_found: t("errorNotFound"),
    too_late: t("errorTooLate"),
    already_cancelled: t("errorAlreadyCancelled"),
    server_error: t("errorServer"),
  };

  return (
    <div className="max-w-[840px] mx-auto px-4 sm:px-5 md:px-8 py-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-teal-50 text-teal-600 grid place-items-center shrink-0">
            <User className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="display-h2 text-[24px] md:text-[32px] text-ink-900 leading-tight truncate">
              {t("title")}
            </h1>
            <div className="text-[13px] text-ink-500 truncate">
              {user.profile.full_name}
            </div>
          </div>
        </div>
      </header>

      <AccountBookings
        bookings={bookings}
        locale={locale}
        emptyTitle={t("emptyTitle")}
        emptyBody={t("emptyBody")}
        emptyCta={t("emptyCta")}
        cancelLabel={t("cancel")}
        cancelConfirmTitle={t("cancelConfirmTitle")}
        cancelConfirmBody={t("cancelConfirmBody")}
        cancelConfirmYes={t("cancelConfirmYes")}
        cancelConfirmNo={t("cancelConfirmNo")}
        upcomingLabel={t("upcoming")}
        pastLabel={t("past")}
        statusLabels={statusLabels}
        errorMessages={errorMessages}
        reviewsByAppt={reviewsByAppt}
        reviewsLabels={{
          leaveReviewCta: tr("leaveReviewCta"),
          youRated: (n: number) => tr("youRated", { n }),
        }}
      />
    </div>
  );
}
