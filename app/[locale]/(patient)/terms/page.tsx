import { setRequestLocale, getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/legal/legal-shell";

export default async function TermsPage({
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
      doc="terms"
      locale={locale}
      title={isAr ? "شروط الاستخدام" : "Terms of Service"}
      subtitle={
        isAr
          ? "الشروط اللي بتحكم استخدامك لمنصة Dental Map."
          : "The terms governing your use of Dental Map."
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
        These Terms of Service govern your access to and use of <strong>Dental Map</strong>, an
        online directory and booking platform that connects patients in Egypt with dental
        practitioners and clinics. By creating an account or using the service, you agree to
        these terms. If you don't agree, please don't use the service.
      </p>

      <h2>1. What Dental Map is — and what it isn't</h2>
      <p>
        Dental Map is a <strong>marketplace and scheduling platform</strong>. It helps you find
        dentists, see real-time availability, and book appointments. The actual dental care is
        provided by independent dentists and clinics — Dental Map does not provide medical
        services, does not employ the dentists listed, and does not guarantee the quality of
        any care you receive.
      </p>
      <p>
        For any clinical question (symptoms, treatments, second opinions, prescriptions),
        contact a licensed dentist directly. Dental Map cannot give medical advice.
      </p>

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>If you book on behalf of a minor (your child) or another adult (a family member), you must be authorized to do so.</li>
        <li>You must provide accurate information — name, email, and a phone number that actually reaches you.</li>
      </ul>

      <h2>3. Your account</h2>
      <p>
        You're responsible for everything done under your account. Keep your password
        confidential. If you suspect unauthorized access, change your password immediately and
        email <a href="mailto:support@dentalmap.eg">support@dentalmap.eg</a>.
      </p>

      <h2>4. Bookings, fees, and payment</h2>
      <ul>
        <li>The fee for each appointment is set by the clinic and shown before you confirm.</li>
        <li>During the pilot phase, <strong>Dental Map charges no platform fee</strong> — neither to you nor to the clinic.</li>
        <li>You pay the clinic directly at the time of your visit. Dental Map does not collect or hold money.</li>
        <li>Confirmed bookings are passed to the clinic in real-time and written into the dentist's calendar.</li>
      </ul>

      <h2>5. Cancellation, no-shows, and rescheduling</h2>
      <p>
        Cancellation is governed by our <a href="/cancellation">Cancellation Policy</a>. In
        short:
      </p>
      <ul>
        <li>You may cancel up to <strong>2 hours</strong> before your appointment from the My bookings page.</li>
        <li>Inside that window, please contact the clinic directly.</li>
        <li>Repeated no-shows may lead to your account being flagged or suspended, at the clinic's request.</li>
      </ul>

      <h2>6. Reviews</h2>
      <ul>
        <li>Only patients who have a <strong>completed</strong> appointment can leave a review for that dentist.</li>
        <li>Reviews must be honest, factual, and respectful. We remove reviews that contain hate speech, harassment, or false claims.</li>
        <li>Reviews are public and tied to your first name. We may anonymize them at our discretion if a privacy concern arises.</li>
      </ul>

      <h2>7. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Create fake accounts or impersonate someone else</li>
        <li>Make bookings you don't intend to attend</li>
        <li>Scrape, copy, or republish content from the platform</li>
        <li>Attempt to disrupt the service or bypass security</li>
        <li>Use the platform for anything illegal under Egyptian law</li>
      </ul>

      <h2>8. Clinic responsibilities</h2>
      <p>
        Clinics that join Dental Map agree to keep their working hours, fees, and dentist
        profiles accurate; to honor confirmed bookings; and to handle your personal data in
        line with our <a href="/privacy">Privacy Policy</a> and applicable Egyptian law,
        including the medical professional secrecy obligations under the Egyptian Medical
        Profession Law.
      </p>

      <h2>9. Suspension and termination</h2>
      <p>
        We may suspend or close your account if you breach these terms or if there is fraud,
        abuse, or repeated no-shows. You can close your account at any time by emailing{" "}
        <a href="mailto:support@dentalmap.eg">support@dentalmap.eg</a>.
      </p>

      <h2>10. Disclaimer of warranties</h2>
      <p>
        The service is provided "as is" and "as available." To the maximum extent permitted by
        Egyptian law, Dental Map disclaims all warranties — express or implied — including
        warranties of merchantability, fitness for a particular purpose, and non-infringement.
        We do not warrant that listings, availability, fees, or other clinic-provided
        information are always accurate or up-to-date in real time, although we work to keep
        them so.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by Egyptian law, Dental Map will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or any loss of
        profits or revenues, arising from your use of the service. Our total liability for any
        claim will not exceed the platform fees you paid us in the 12 months before the
        incident — which during the pilot is zero.
      </p>
      <p>
        Nothing in these terms limits any liability that cannot be limited under Egyptian law,
        including liability for fraud, willful misconduct, or harm to the body.
      </p>

      <h2>12. Intellectual property</h2>
      <p>
        The Dental Map name, logo, design, and underlying software are owned by us. Listing
        content (clinic names, photos, dentist bios) is owned by the clinics and licensed to
        Dental Map for use on the platform. Reviews you write remain yours, but you grant
        Dental Map a license to display them on the platform.
      </p>

      <h2>13. Changes to the terms</h2>
      <p>
        We may update these terms as the service evolves. We'll notify you by email or in-app
        banner for material changes. Continued use of the platform after the update means you
        accept the new terms.
      </p>

      <h2>14. Governing law and dispute resolution</h2>
      <p>
        These terms are governed by the laws of the Arab Republic of Egypt. Any dispute that
        cannot be resolved by good-faith negotiation will be submitted to the competent courts
        of Cairo, Egypt.
      </p>

      <h2>15. Contact</h2>
      <p>
        For any question about these terms:{" "}
        <a href="mailto:legal@dentalmap.eg">legal@dentalmap.eg</a>.
      </p>
    </>
  );
}

function Arabic() {
  return (
    <>
      <p>
        شروط الاستخدام دي بتحكم وصولك واستخدامك لمنصة <strong>Dental Map</strong>، منصة إلكترونية
        لربط المرضى في مصر بأطباء الأسنان وحجز المواعيد. بإنشاء حساب أو باستخدام الخدمة، إنت
        موافق على الشروط دي. لو مش موافق، رجاءً متستخدمش الخدمة.
      </p>

      <h2>1. إيه هي Dental Map — وإيه مش هي</h2>
      <p>
        Dental Map هي <strong>منصة وسيطة وحجز إلكتروني</strong>. بتساعدك تلاقي طبيب وتشوف
        المواعيد المتاحة وتحجز. الرعاية الفعلية بيقدّمها أطباء وعيادات مستقلين — Dental Map
        مش مقدمة خدمة طبية، ومش بتوظف الأطباء المعروضين، ومش ضامنة جودة العلاج اللي هتتلقاه.
      </p>
      <p>
        لأي استفسار طبي (أعراض، علاجات، رأي ثاني، روشتات)، تواصل مع الطبيب مباشرة. Dental Map
        مش بتقدر تقدّم نصيحة طبية.
      </p>

      <h2>2. الأهلية</h2>
      <ul>
        <li>لازم تكون 18 سنة فما فوق عشان تنشئ حساب.</li>
        <li>لو بتحجز نيابة عن قاصر (طفلك) أو شخص بالغ تاني، لازم تكون مفوّض بكده.</li>
        <li>لازم تقدّم بيانات صحيحة — اسم، إيميل، ورقم تليفون شغّال.</li>
      </ul>

      <h2>3. حسابك</h2>
      <p>
        إنت مسؤول عن كل اللي يحصل من حسابك. خلّي كلمة المرور سرية. لو شككت في وصول غير مصرّح به،
        غيّرها فورًا وابعت إيميل لـ{" "}
        <a href="mailto:support@dentalmap.eg">support@dentalmap.eg</a>.
      </p>

      <h2>4. الحجز والرسوم والدفع</h2>
      <ul>
        <li>رسوم كل حجز بتحددها العيادة وبتظهرلك قبل ما تأكّد.</li>
        <li>خلال مرحلة التجربة، <strong>Dental Map مش بتاخد عمولة</strong> — لا منك ولا من العيادة.</li>
        <li>إنت بتدفع للعيادة مباشرة وقت زيارتك. Dental Map مش بتقبض أو تحتفظ بأي فلوس.</li>
        <li>الحجوزات المؤكدة بتتنقل للعيادة لحظيًا وبتتسجّل في تقويم الطبيب.</li>
      </ul>

      <h2>5. الإلغاء وعدم الحضور وإعادة الجدولة</h2>
      <p>
        الإلغاء بيخضع لـ <a href="/cancellation">سياسة الإلغاء</a>. باختصار:
      </p>
      <ul>
        <li>تقدر تلغي قبل الموعد بـ <strong>ساعتين</strong> من صفحة "حجوزاتي".</li>
        <li>داخل النافذة دي، اتصل بالعيادة مباشرة.</li>
        <li>عدم الحضور المتكرر ممكن يؤدي لتعليق الحساب بناءً على طلب العيادة.</li>
      </ul>

      <h2>6. التقييمات</h2>
      <ul>
        <li>المرضى اللي عندهم موعد <strong>تم</strong> فقط هم اللي يقدروا يقيّموا الطبيب.</li>
        <li>التقييمات لازم تكون صادقة ومحترمة. بنشيل أي تقييم فيه كراهية أو تحرش أو ادعاءات كاذبة.</li>
        <li>التقييمات عامة ومرتبطة باسمك الأول. ممكن نخليها مجهولة المصدر لو في مخاوف تخص الخصوصية.</li>
      </ul>

      <h2>7. الاستخدام المقبول</h2>
      <p>إنت موافق إنك متعملش الحاجات دي:</p>
      <ul>
        <li>تنشئ حسابات وهمية أو تنتحل شخصية حد</li>
        <li>تعمل حجوزات مش ناوي تحضرها</li>
        <li>تنسخ أو تنشر محتوى من المنصة</li>
        <li>تحاول تعطّل الخدمة أو تتجاوز الأمان</li>
        <li>تستخدم المنصة في أي حاجة غير قانونية تحت القانون المصري</li>
      </ul>

      <h2>8. التزامات العيادة</h2>
      <p>
        العيادات اللي بتنضم لـ Dental Map بتلتزم إنها تحافظ على دقة ساعات العمل والرسوم وملفات
        الأطباء، إنها تحترم الحجوزات المؤكدة، وإنها تتعامل مع بياناتك الشخصية بما يتوافق مع{" "}
        <a href="/privacy">سياسة الخصوصية</a> والقوانين المصرية المعمول بها، بما في ذلك
        التزامات السرية المهنية الطبية تحت قانون مزاولة المهنة المصري.
      </p>

      <h2>9. التعليق وإنهاء الحساب</h2>
      <p>
        ممكن نعلّق أو نقفل حسابك لو خرقت الشروط دي أو لو في احتيال أو إساءة استخدام أو عدم حضور
        متكرر. تقدر تقفل حسابك في أي وقت بإيميل لـ{" "}
        <a href="mailto:support@dentalmap.eg">support@dentalmap.eg</a>.
      </p>

      <h2>10. إخلاء المسؤولية عن الضمانات</h2>
      <p>
        الخدمة بتتقدّم "كما هي" و "كما تتاح". لأقصى حد يسمح به القانون المصري، Dental Map بتُخلي
        مسؤوليتها من كل الضمانات — الصريحة والضمنية — بما في ذلك ضمانات القابلية للتسويق
        والملاءمة لغرض معين. مش بنضمن إن البيانات اللي تقدّمها العيادات (مواعيد، رسوم، إلخ)
        دقيقة بشكل لحظي طول الوقت، رغم إننا بنشتغل عشان تكون كده.
      </p>

      <h2>11. تحديد المسؤولية</h2>
      <p>
        لأقصى حد يسمح به القانون المصري، Dental Map مش هتكون مسؤولة عن أي أضرار غير مباشرة أو
        عرضية أو خاصة أو تبعية أو تأديبية، أو أي خسارة في الأرباح، نتيجة استخدامك للخدمة.
        إجمالي مسؤوليتنا عن أي مطالبة مش هيتجاوز رسوم المنصة اللي دفعتها لينا في الـ 12 شهر
        قبل الحادثة — واللي خلال التجربة بتساوي صفر.
      </p>
      <p>
        مفيش حاجة في الشروط دي بتحدّ من أي مسؤولية لا يمكن تحديدها قانونًا تحت القانون المصري،
        بما في ذلك المسؤولية عن الاحتيال أو سوء السلوك المتعمد أو الأذى الجسدي.
      </p>

      <h2>12. الملكية الفكرية</h2>
      <p>
        اسم Dental Map وشعارها وتصميمها والبرامج الأساسية ملكنا. محتوى القوائم (أسماء العيادات
        والصور والسير الذاتية) ملك العيادات ومرخص لـ Dental Map للاستخدام على المنصة.
        التقييمات اللي بتكتبها تظل ملكك، لكنك بتمنح Dental Map ترخيصًا لعرضها على المنصة.
      </p>

      <h2>13. تعديل الشروط</h2>
      <p>
        ممكن نحدّث الشروط دي مع تطور الخدمة. هنبلّغك بإيميل أو ببانر لو في تغييرات جوهرية.
        استمرارك في استخدام المنصة بعد التحديث معناه قبولك للشروط الجديدة.
      </p>

      <h2>14. القانون الحاكم وفض النزاعات</h2>
      <p>
        الشروط دي بتحكمها قوانين جمهورية مصر العربية. أي نزاع لا يمكن حله بحسن نية يُحال
        للمحاكم المختصة في القاهرة، مصر.
      </p>

      <h2>15. التواصل</h2>
      <p>
        لأي استفسار عن الشروط دي:{" "}
        <a href="mailto:legal@dentalmap.eg">legal@dentalmap.eg</a>.
      </p>
    </>
  );
}
