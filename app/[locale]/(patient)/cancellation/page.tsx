import { setRequestLocale, getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/legal/legal-shell";

export default async function CancellationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");
  const isAr = locale === "ar";

  return (
    <LegalShell
      doc="cancellation"
      locale={locale}
      title={isAr ? "سياسة الإلغاء" : "Cancellation Policy"}
      subtitle={
        isAr
          ? "إزاي تلغي حجزك ومتى تنفع تلغي."
          : "How and when you can cancel a booking."
      }
      lastUpdated={t("lastUpdated")}
      draftNotice={t("draftNotice")}
      backLabel={t("back")}
      navLabels={{
        privacy: t("navPrivacy"),
        terms: t("navTerms"),
        cancellation: t("navCancellation"),
        cookies: t("navCookies"),
      }}
    >
      {isAr ? <Arabic /> : <English />}
    </LegalShell>
  );
}

function English() {
  return (
    <>
      <p>
        We want booking on Dental Map to feel low-risk. This page sets out the rules for
        cancelling a confirmed appointment.
      </p>

      <h2>1. Free cancellation up to 2 hours before</h2>
      <p>
        You can cancel any confirmed booking from your <a href="/account">My bookings</a> page
        as long as the appointment is at least <strong>2 hours away</strong>. The slot is
        immediately released so other patients can book it, and the dentist's calendar is
        updated automatically.
      </p>
      <ul>
        <li>No fee — neither the platform nor the clinic charges anything for cancellations made within this window.</li>
        <li>You'll receive a confirmation that the cancellation went through.</li>
        <li>You can rebook with the same dentist or a different one any time.</li>
      </ul>

      <h2>2. Cancellation inside the 2-hour window</h2>
      <p>
        If your appointment is less than 2 hours away, the cancel button on Dental Map is
        disabled. To cancel:
      </p>
      <ul>
        <li>Call the clinic directly using the phone number on the dentist's profile page.</li>
        <li>Or message them on WhatsApp if they have it listed.</li>
      </ul>
      <p>
        Why? Last-minute cancellations are hard for clinics to refill, and we want to encourage
        you to give them as much notice as possible. The 2-hour window is a fairness rule, not
        a technical one — clinics can refill slots if they know in advance.
      </p>

      <h2>3. No-shows</h2>
      <p>
        A "no-show" is when you don't arrive for your appointment and didn't cancel
        beforehand. Clinics may flag no-shows on Dental Map. We don't apply any fee during the
        pilot, but:
      </p>
      <ul>
        <li>Repeated no-shows (3+ across any clinics) may lead to your account being suspended.</li>
        <li>Some clinics may decline future bookings from a patient with a no-show history.</li>
      </ul>
      <p>
        If you're going to be late, call the clinic. Most will hold the slot for you.
      </p>

      <h2>4. Cancellation by the clinic</h2>
      <p>
        Occasionally, a clinic may need to cancel — illness, equipment issues, emergencies.
        When that happens:
      </p>
      <ul>
        <li>You receive an email and an in-app notification immediately.</li>
        <li>The booking moves to "cancelled" status with the reason if the clinic provided one.</li>
        <li>You're not charged anything, and you can rebook with the same or a different dentist.</li>
        <li>If the clinic offers an alternative slot, it appears in your account so you can accept or decline.</li>
      </ul>

      <h2>5. Refunds</h2>
      <p>
        Dental Map does not collect payment online. Fees are paid directly to the clinic at
        your visit. If you paid the clinic in advance for any reason (some clinics request a
        deposit for specialised work), refunds are handled <strong>directly between you and
        the clinic</strong> — Dental Map cannot intervene in money that didn't pass through us.
      </p>
      <p>
        If a clinic refuses to refund a deposit you reasonably believe is owed, please email{" "}
        <a href="mailto:support@dentalmap.app">support@dentalmap.app</a>. We can mediate, though
        we cannot legally compel the clinic.
      </p>

      <h2>6. Pilot phase note</h2>
      <p>
        During the pilot phase (2026), Dental Map charges no platform fee to patients or
        clinics. After the pilot, this policy may be updated to add a small no-show fee or a
        late-cancellation fee, capped to a fraction of the appointment fee. Any change will be
        communicated by email at least 14 days before it takes effect.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about a cancellation, or a clinic that's not honouring this policy:{" "}
        <a href="mailto:support@dentalmap.app">support@dentalmap.app</a>.
      </p>
    </>
  );
}

function Arabic() {
  return (
    <>
      <p>
        إحنا عايزين الحجز على Dental Map يبقى بدون مخاطرة. الصفحة دي بتوضّح قواعد إلغاء أي حجز
        مؤكد.
      </p>

      <h2>1. إلغاء مجاني قبل الموعد بساعتين</h2>
      <p>
        تقدر تلغي أي حجز مؤكد من صفحة <a href="/account">حجوزاتي</a> طول ما الموعد بعيد
        بـ <strong>ساعتين</strong> على الأقل. الفترة بتترجع متاحة على طول لمرضى تانيين، وتقويم
        الطبيب بيتحدّث تلقائيًا.
      </p>
      <ul>
        <li>مفيش رسوم — لا المنصة ولا العيادة بتاخد أي حاجة على الإلغاء داخل النافذة دي.</li>
        <li>هتوصلك رسالة تأكيد إن الإلغاء تم.</li>
        <li>تقدر تحجز تاني مع نفس الطبيب أو طبيب تاني في أي وقت.</li>
      </ul>

      <h2>2. الإلغاء داخل آخر ساعتين</h2>
      <p>
        لو الموعد أقل من ساعتين، زر الإلغاء على Dental Map بيكون موقوف. عشان تلغي:
      </p>
      <ul>
        <li>اتصل بالعيادة مباشرة على الرقم اللي في صفحة الطبيب.</li>
        <li>أو ابعت لهم رسالة واتساب لو الرقم متاح.</li>
      </ul>
      <p>
        ليه؟ لأن الإلغاء في اللحظة الأخيرة صعب على العيادة تعوّضه، وإحنا عايزينك تبلّغهم بأكبر
        وقت ممكن. النافذة دي قاعدة عدالة، مش قيد تقني — العيادات بتقدر تملأ المواعيد لو عرفت
        مقدمًا.
      </p>

      <h2>3. عدم الحضور</h2>
      <p>
        "عدم الحضور" يعني إنك متجيش للموعد ومتلغيش قبله. العيادات تقدر تحدد عدم الحضور على
        Dental Map. إحنا مش بنطبّق رسوم خلال التجربة، بس:
      </p>
      <ul>
        <li>عدم الحضور المتكرر (3 مرات أو أكتر مع أي عيادات) ممكن يؤدي لتعليق حسابك.</li>
        <li>بعض العيادات ممكن ترفض حجوزات مستقبلية من مريض عنده تاريخ عدم حضور.</li>
      </ul>
      <p>
        لو هتتأخر، اتصل بالعيادة. أغلبهم هيحجزولك المكان.
      </p>

      <h2>4. الإلغاء من العيادة</h2>
      <p>
        أحيانًا العيادة محتاجة تلغي — مرض، عطل أجهزة، طوارئ. لما يحصل ده:
      </p>
      <ul>
        <li>هتوصلك رسالة إيميل وإشعار داخل التطبيق على طول.</li>
        <li>الحجز ينتقل لحالة "ملغي" مع السبب لو العيادة كتبته.</li>
        <li>مش هتدفع أي حاجة، وتقدر تحجز مع نفس الطبيب أو طبيب تاني.</li>
        <li>لو العيادة عرضت ميعاد بديل، هيظهر في حسابك تقبله أو ترفضه.</li>
      </ul>

      <h2>5. الاسترداد</h2>
      <p>
        Dental Map مش بتحصّل أي مدفوعات إلكترونية. الرسوم بتدفعها للعيادة مباشرة وقت زيارتك. لو
        دفعت للعيادة مقدمًا لأي سبب (بعض العيادات بتطلب عربون للعمليات المتخصصة)، الاسترداد بيتم{" "}
        <strong>مباشرة بينك وبين العيادة</strong> — Dental Map مش بتقدر تتدخل في فلوس مادخلتش
        من خلالها.
      </p>
      <p>
        لو عيادة رفضت ترد عربون تعتقد إنه مستحق ليك، ابعتلنا على{" "}
        <a href="mailto:support@dentalmap.app">support@dentalmap.app</a>. نقدر نوسط، لكن
        مش نقدر نلزم العيادة قانونيًا.
      </p>

      <h2>6. ملاحظة عن مرحلة التجربة</h2>
      <p>
        خلال مرحلة التجربة (2026)، Dental Map مش بتاخد أي رسوم من المرضى أو العيادات. بعد
        التجربة، السياسة دي ممكن تتحدّث لتضيف رسم بسيط على عدم الحضور أو الإلغاء المتأخر،
        محدّد بنسبة من رسوم الموعد. أي تغيير هيتم إبلاغك به بالإيميل قبل التطبيق بـ 14 يوم
        على الأقل.
      </p>

      <h2>7. التواصل</h2>
      <p>
        أي استفسار عن إلغاء، أو عيادة مش بتلتزم بالسياسة دي:{" "}
        <a href="mailto:support@dentalmap.app">support@dentalmap.app</a>.
      </p>
    </>
  );
}
