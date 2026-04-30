import { setRequestLocale, getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/legal/legal-shell";

export default async function PrivacyPage({
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
      doc="privacy"
      locale={locale}
      title={isAr ? "سياسة الخصوصية" : "Privacy Policy"}
      subtitle={
        isAr
          ? "كيف نجمع بياناتك وكيف نستخدمها وكيف نحميها."
          : "How we collect your data, how we use it, and how we protect it."
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
        <strong>Dental Map</strong> is operated from Cairo, Egypt as an online directory and
        booking platform that connects patients with dental professionals. This Privacy Policy
        explains what personal data we collect when you use our website (dental-map-mvp.vercel.app
        and any future production domain), what we do with it, and the rights you have over it
        under Egyptian Law No. 151 of 2020 (Personal Data Protection Law) and applicable best
        practices.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        The data controller is Dental Map. You can contact us at{" "}
        <a href="mailto:privacy@dentalmap.eg">privacy@dentalmap.eg</a> for any privacy-related
        question, including requests to access, correct, or delete your data.
      </p>

      <h2>2. What we collect</h2>
      <h3>Account data</h3>
      <ul>
        <li>Full name</li>
        <li>Email address (used as your login)</li>
        <li>Phone number (mandatory at booking so the clinic can reach you)</li>
        <li>Encrypted password (we never see the plaintext)</li>
        <li>Preferred locale (Arabic / English)</li>
      </ul>

      <h3>Booking data</h3>
      <ul>
        <li>The dentist and clinic you booked with</li>
        <li>Date, time, and duration of the appointment</li>
        <li>Fee at the time of booking</li>
        <li>Optional note you wrote for the clinic (we recommend not including sensitive medical history)</li>
        <li>Status of the appointment (pending / confirmed / completed / cancelled / no-show)</li>
      </ul>

      <h3>Technical data</h3>
      <ul>
        <li>IP address and approximate location (city level)</li>
        <li>Device type, browser, and operating system</li>
        <li>Pages you visited on Dental Map</li>
        <li>Authentication cookies (essential for keeping you signed in)</li>
      </ul>

      <p>
        We <strong>do not</strong> collect detailed clinical history, diagnoses, treatment plans,
        prescriptions, x-rays, or any other clinical record. Those stay between you and the
        clinic.
      </p>

      <h2>3. How we use your data</h2>
      <ul>
        <li>To create your account and authenticate you</li>
        <li>To process your booking and pass relevant details to the clinic you booked with</li>
        <li>To send appointment confirmations, reminders, and review requests by email</li>
        <li>To enable post-appointment reviews</li>
        <li>To improve the product (aggregated, non-identifying analytics)</li>
        <li>To prevent fraud, abuse, and protect the integrity of the platform</li>
        <li>To comply with legal obligations</li>
      </ul>

      <h2>4. Who we share with</h2>
      <h3>The clinic you book with</h3>
      <p>
        When you book an appointment, the clinic and the specific dentist receive your name,
        phone number, email, the time you booked, and any note you wrote. They need this to
        contact you, prepare for your visit, and write the appointment into their internal
        scheduling system (Google Calendar and any other tool the clinic uses).
      </p>

      <h3>Service providers</h3>
      <p>We use the following processors to run the service:</p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Region</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase</td>
            <td>Database, authentication, file storage</td>
            <td>EU (Stockholm)</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Application hosting and edge delivery</td>
            <td>Global</td>
          </tr>
          <tr>
            <td>Google Calendar API</td>
            <td>Reading dentist availability, writing appointment events</td>
            <td>Global</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Transactional email delivery</td>
            <td>Global</td>
          </tr>
        </tbody>
      </table>
      <p>
        Each of these providers has been chosen because of their security practices and is bound
        by data-processing terms. None of them sells your data.
      </p>

      <h3>Legal requests</h3>
      <p>
        We may disclose your data when required by Egyptian law, a valid court order, or to
        protect the rights and safety of users.
      </p>

      <h2>5. International transfers</h2>
      <p>
        Some of our processors store and process data outside Egypt (Supabase in the EU, Vercel
        and Google globally). Where we transfer data internationally, we rely on the safeguards
        offered by the processor (Standard Contractual Clauses, equivalent agreements, or the
        adequacy of the destination country's privacy regime).
      </p>

      <h2>6. How long we keep your data</h2>
      <ul>
        <li><strong>Account data</strong> — for as long as your account is active. If you ask us to delete it, we remove it within 30 days, except where a legal obligation requires us to keep it longer.</li>
        <li><strong>Booking records</strong> — kept for up to 7 years to comply with commercial record-keeping obligations under Egyptian law, even after account deletion.</li>
        <li><strong>Technical logs</strong> — kept for up to 90 days for security and abuse-prevention purposes.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>Under Law 151/2020 you have the right to:</p>
      <ul>
        <li>Know what personal data we hold about you</li>
        <li>Request a copy of that data</li>
        <li>Correct it if it's inaccurate</li>
        <li>Ask us to delete it (subject to legal retention obligations)</li>
        <li>Withdraw consent we previously relied on</li>
        <li>Lodge a complaint with the Egyptian Personal Data Protection Centre</li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href="mailto:privacy@dentalmap.eg">privacy@dentalmap.eg</a> from the address linked
        to your account. We respond within 30 days.
      </p>

      <h2>8. Security</h2>
      <p>
        We protect data with industry-standard measures: TLS in transit, encryption at rest for
        the database, row-level security on every patient-writable table, encrypted Google
        Calendar tokens, and least-privilege access for staff. Despite this, no online service
        can be guaranteed 100% secure. If we ever discover a breach affecting your data, we will
        notify you and the regulator within the timeframes required by Egyptian law.
      </p>

      <h2>9. Children</h2>
      <p>
        Dental Map is not designed for children under 18. If you are booking on behalf of a
        minor, you must be the parent or legal guardian and accept this policy on their behalf.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy as our service evolves. The "Last updated" date at the top
        reflects the current version. For material changes (such as new categories of data or
        new processors), we will notify you by email or in-app banner.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions, complaints, or data requests:{" "}
        <a href="mailto:privacy@dentalmap.eg">privacy@dentalmap.eg</a>.
      </p>
    </>
  );
}

function Arabic() {
  return (
    <>
      <p>
        <strong>Dental Map</strong> منصة إلكترونية مقرها القاهرة، مصر، تربط المرضى بأطباء الأسنان
        وتتيح حجز المواعيد. توضح سياسة الخصوصية دي إيه البيانات اللي بنجمعها لما تستخدم موقعنا
        (dental-map-mvp.vercel.app وأي نطاق نهائي مستقبلًا)، وإحنا بنعمل بيها إيه، وحقوقك تجاهها
        تحت قانون حماية البيانات الشخصية رقم 151 لسنة 2020 وأفضل الممارسات المعمول بها.
      </p>

      <h2>1. مين المسؤول</h2>
      <p>
        المسؤول عن البيانات هو Dental Map. تقدر تتواصل معانا على{" "}
        <a href="mailto:privacy@dentalmap.eg">privacy@dentalmap.eg</a> لأي استفسار يخص الخصوصية،
        بما في ذلك طلبات الوصول لبياناتك أو تصحيحها أو حذفها.
      </p>

      <h2>2. إيه اللي بنجمعه</h2>
      <h3>بيانات الحساب</h3>
      <ul>
        <li>الاسم الكامل</li>
        <li>البريد الإلكتروني (يستخدم لتسجيل الدخول)</li>
        <li>رقم الهاتف (مطلوب وقت الحجز عشان العيادة تقدر تتواصل معاك)</li>
        <li>كلمة مرور مشفّرة (إحنا مش بنشوف النص الأصلي)</li>
        <li>اللغة المفضلة (عربي / إنجليزي)</li>
      </ul>

      <h3>بيانات الحجز</h3>
      <ul>
        <li>الطبيب والعيادة اللي حجزت معاهم</li>
        <li>تاريخ ووقت ومدة الموعد</li>
        <li>رسوم الحجز وقت الحجز</li>
        <li>أي ملاحظة كتبتها للعيادة (يُفضّل عدم كتابة تاريخ مرضي حساس فيها)</li>
        <li>حالة الموعد (في الانتظار / مؤكد / تم / ملغي / لم يحضر)</li>
      </ul>

      <h3>بيانات تقنية</h3>
      <ul>
        <li>عنوان الـ IP والموقع التقريبي (على مستوى المدينة)</li>
        <li>نوع الجهاز والمتصفح ونظام التشغيل</li>
        <li>الصفحات اللي زرتها على Dental Map</li>
        <li>كوكيز المصادقة (ضرورية لتفعيل تسجيل الدخول)</li>
      </ul>

      <p>
        إحنا <strong>مش</strong> بنجمع تاريخك المرضي أو التشخيص أو خطط العلاج أو الوصفات أو
        الأشعة أو أي سجل طبي تفصيلي. ده كله يبقى بينك وبين العيادة.
      </p>

      <h2>3. إزاي بنستخدم بياناتك</h2>
      <ul>
        <li>إنشاء حسابك والتحقق من هويتك</li>
        <li>معالجة حجزك ونقل التفاصيل اللازمة للعيادة</li>
        <li>إرسال تأكيدات الحجز والتذكيرات وطلبات التقييم بالبريد</li>
        <li>تمكين التقييمات بعد الموعد</li>
        <li>تحسين المنتج (تحليلات مجمّعة وغير شخصية)</li>
        <li>منع الاحتيال وحماية المنصة</li>
        <li>الامتثال للالتزامات القانونية</li>
      </ul>

      <h2>4. مع مين بنشارك البيانات</h2>
      <h3>العيادة اللي بتحجز فيها</h3>
      <p>
        لما تحجز موعد، العيادة والطبيب يستلموا اسمك ورقم تليفونك وبريدك ووقت الحجز وأي ملاحظة
        كتبتها. ده عشان يقدروا يتواصلوا معاك ويجهّزوا للزيارة ويسجلوا الموعد في نظام
        الحجز الداخلي بتاعهم (تقويم Google وأي أداة تانية بتستخدمها العيادة).
      </p>

      <h3>مزودو الخدمة</h3>
      <p>إحنا بنستخدم المعالجين دول لتشغيل الخدمة:</p>
      <table>
        <thead>
          <tr>
            <th>المزوّد</th>
            <th>الغرض</th>
            <th>المنطقة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase</td>
            <td>قاعدة البيانات والمصادقة وتخزين الملفات</td>
            <td>الاتحاد الأوروبي (ستوكهولم)</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>استضافة التطبيق</td>
            <td>عالمي</td>
          </tr>
          <tr>
            <td>Google Calendar API</td>
            <td>قراءة جدول الطبيب وكتابة المواعيد</td>
            <td>عالمي</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>إرسال رسائل البريد الخاصة بالحجوزات</td>
            <td>عالمي</td>
          </tr>
        </tbody>
      </table>
      <p>
        المزودين دول مختارين بناءً على ممارساتهم الأمنية ومرتبطين باتفاقيات معالجة بيانات. ولا
        واحد فيهم بيبيع بياناتك.
      </p>

      <h3>الطلبات القانونية</h3>
      <p>
        ممكن نكشف عن بياناتك لما القانون المصري يطلب، أو بأمر محكمة، أو لحماية حقوق وسلامة
        المستخدمين.
      </p>

      <h2>5. النقل الدولي للبيانات</h2>
      <p>
        بعض المعالجين بيخزّنوا البيانات خارج مصر (Supabase في الاتحاد الأوروبي، Vercel و Google
        عالميًا). لما ننقل بيانات للخارج، إحنا بنعتمد على الضمانات اللي بيوفرها المعالج (الشروط
        التعاقدية القياسية، أو ما يعادلها، أو كفاية النظام الخصوصي للدولة المستقبِلة).
      </p>

      <h2>6. مدة الاحتفاظ بالبيانات</h2>
      <ul>
        <li><strong>بيانات الحساب</strong> — طول ما حسابك نشط. لما تطلب الحذف، بنحذفها خلال 30 يوم، إلا لو في التزام قانوني بالاحتفاظ بها.</li>
        <li><strong>سجلات الحجز</strong> — تتحفظ لمدة تصل لـ 7 سنين امتثالًا للالتزامات التجارية تحت القانون المصري، حتى بعد حذف الحساب.</li>
        <li><strong>السجلات التقنية</strong> — تتحفظ لمدة تصل لـ 90 يوم لأغراض الأمن ومنع الإساءة.</li>
      </ul>

      <h2>7. حقوقك</h2>
      <p>تحت القانون 151/2020 ليك الحق في:</p>
      <ul>
        <li>معرفة البيانات الشخصية اللي بنحتفظ بيها عنك</li>
        <li>طلب نسخة من بياناتك</li>
        <li>تصحيح أي بيانات غير دقيقة</li>
        <li>طلب حذف بياناتك (مع مراعاة الالتزامات القانونية)</li>
        <li>سحب الموافقة اللي اعتمدنا عليها قبل كده</li>
        <li>تقديم شكوى للمركز المصري لحماية البيانات الشخصية</li>
      </ul>
      <p>
        لممارسة أي من حقوقك، ابعت إيميل من العنوان المرتبط بحسابك على{" "}
        <a href="mailto:privacy@dentalmap.eg">privacy@dentalmap.eg</a>. بنرد خلال 30 يوم.
      </p>

      <h2>8. الأمان</h2>
      <p>
        إحنا بنحمي البيانات بإجراءات قياسية: تشفير في النقل (TLS)، تشفير في التخزين، أمان على
        مستوى الصف لكل جدول قابل للكتابة من المرضى، تشفير توكنز Google Calendar، ووصول محدود
        للموظفين. مع كده، مفيش خدمة على الإنترنت بنسبة 100% آمنة. لو حصل خرق يؤثر على بياناتك،
        هنبلّغك أنت والجهة التنظيمية في المواعيد اللي يحددها القانون المصري.
      </p>

      <h2>9. الأطفال</h2>
      <p>
        Dental Map مش مصمّم للأطفال تحت 18 سنة. لو بتحجز نيابة عن قاصر، لازم تكون ولي الأمر
        وتقبل السياسة دي بالنيابة عنه.
      </p>

      <h2>10. التعديلات على السياسة</h2>
      <p>
        ممكن نحدّث السياسة دي مع تطور الخدمة. تاريخ "آخر تحديث" فوق بيعكس النسخة الحالية. لو في
        تغييرات جوهرية (زي فئات بيانات جديدة أو معالجين جدد)، هنبلّغك بالإيميل أو ببانر داخل
        التطبيق.
      </p>

      <h2>11. التواصل</h2>
      <p>
        أسئلة، شكاوى، أو طلبات بيانات:{" "}
        <a href="mailto:privacy@dentalmap.eg">privacy@dentalmap.eg</a>.
      </p>
    </>
  );
}
