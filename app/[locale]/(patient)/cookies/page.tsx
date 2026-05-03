import { setRequestLocale, getTranslations } from "next-intl/server";
import { LegalShell } from "@/components/legal/legal-shell";

export default async function CookiesPage({
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
      doc="cookies"
      locale={locale}
      title={isAr ? "سياسة الكوكيز" : "Cookies Policy"}
      subtitle={
        isAr
          ? "إيه الكوكيز اللي بنستخدمها وليه."
          : "What cookies we use and why."
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
        Cookies are small text files that websites store on your device. We use them to keep
        you signed in, remember your language preference, and understand how the platform is
        used. This page describes which cookies we set and why.
      </p>

      <h2>1. Categories we use</h2>

      <h3>Essential (always on)</h3>
      <p>
        These cookies are necessary for Dental Map to work at all. You can't disable them
        without breaking the site.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Lifespan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-access-token, sb-refresh-token</td>
            <td>Supabase authentication — keeps you signed in</td>
            <td>1 hour / 7 days (refreshed automatically)</td>
          </tr>
          <tr>
            <td>NEXT_LOCALE</td>
            <td>Remembers whether you prefer Arabic or English</td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>

      <h3>Analytics (anonymous)</h3>
      <p>
        We use a privacy-respecting analytics tool to understand which pages people visit and
        where the product is rough. The data is aggregated — we never link it to your account
        or to personally identifying information.
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Data sent</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel Analytics</td>
            <td>Page views, performance metrics</td>
            <td>URL, referrer, user agent — no IP, no fingerprinting, no cross-site tracking</td>
          </tr>
        </tbody>
      </table>

      <h3>Functional (set by services we use)</h3>
      <p>
        When you sign in with Google to connect your calendar, Google sets its own cookies
        during the OAuth handshake. We don't control these, but they're necessary for the
        Google Calendar integration. See{" "}
        <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener">
          Google's cookie policy
        </a>
        .
      </p>

      <h2>2. What we do <em>not</em> use</h2>
      <ul>
        <li>No advertising cookies</li>
        <li>No third-party tracking pixels (Facebook, TikTok, etc.)</li>
        <li>No cross-site behavioural profiling</li>
        <li>No data sold to third parties</li>
      </ul>

      <h2>3. Managing cookies</h2>
      <p>
        You can clear or block cookies via your browser settings. Note: blocking essential
        cookies will sign you out and may break authentication. Blocking analytics cookies has
        no functional impact.
      </p>
      <p>Quick links:</p>
      <ul>
        <li>
          <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">
            Chrome
          </a>
        </li>
        <li>
          <a href="https://support.apple.com/safari/manage-cookies" target="_blank" rel="noopener">
            Safari
          </a>
        </li>
        <li>
          <a href="https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener">
            Firefox
          </a>
        </li>
      </ul>

      <h2>4. Changes to this policy</h2>
      <p>
        If we add a new cookie category (for example, marketing cookies), we will update this
        page and prompt you for consent before setting them.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions: <a href="mailto:privacy@dentalmap.app">privacy@dentalmap.app</a>.
      </p>
    </>
  );
}

function Arabic() {
  return (
    <>
      <p>
        الكوكيز ملفات نصية صغيرة المواقع بتخزّنها على جهازك. إحنا بنستخدمها عشان نخليك مسجل
        دخول، ونفتكر اللغة المفضلة عندك، ونفهم إزاي المنصة بتُستخدم. الصفحة دي بتوضّح الكوكيز
        اللي بنحطها وليه.
      </p>

      <h2>1. الفئات اللي بنستخدمها</h2>

      <h3>الأساسية (دايمًا شغّالة)</h3>
      <p>
        الكوكيز دي ضرورية عشان Dental Map تشتغل أصلًا. مش هتقدر تعطّلها من غير ما الموقع يبطّل
        يشتغل.
      </p>
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الغرض</th>
            <th>المدة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-access-token, sb-refresh-token</td>
            <td>مصادقة Supabase — بتخليك مسجل دخول</td>
            <td>ساعة / 7 أيام (يتجدد تلقائيًا)</td>
          </tr>
          <tr>
            <td>NEXT_LOCALE</td>
            <td>بيفتكر هل بتفضّل عربي ولا إنجليزي</td>
            <td>سنة</td>
          </tr>
        </tbody>
      </table>

      <h3>التحليلات (مجهولة المصدر)</h3>
      <p>
        إحنا بنستخدم أداة تحليلات تحترم الخصوصية عشان نفهم المرضى بيدخلوا فين والمنتج فين فيه
        مشاكل. البيانات مجمّعة — مش بنربطها بحسابك أو ببياناتك الشخصية.
      </p>
      <table>
        <thead>
          <tr>
            <th>المزوّد</th>
            <th>الغرض</th>
            <th>البيانات المُرسلة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel Analytics</td>
            <td>عدد الزيارات وقياسات الأداء</td>
            <td>الرابط، الـ referrer، الـ user agent — بدون IP، بدون بصمة، بدون تتبع بين المواقع</td>
          </tr>
        </tbody>
      </table>

      <h3>الوظيفية (من الخدمات اللي بنستخدمها)</h3>
      <p>
        لما تسجّل دخول بـ Google لربط تقويمك، Google بتحط كوكيزها أثناء الـ OAuth. إحنا مش
        متحكمين فيها، لكنها ضرورية لتكامل Google Calendar. اقرأ{" "}
        <a href="https://policies.google.com/technologies/cookies?hl=ar" target="_blank" rel="noopener">
          سياسة كوكيز Google
        </a>
        .
      </p>

      <h2>2. اللي إحنا <em>مش</em> بنستخدمه</h2>
      <ul>
        <li>مفيش كوكيز إعلانات</li>
        <li>مفيش بكسلات تتبع طرف ثالث (فيسبوك، تيك توك، إلخ)</li>
        <li>مفيش تتبع سلوكي بين المواقع</li>
        <li>مفيش بيانات بتتباع لطرف ثالث</li>
      </ul>

      <h2>3. إدارة الكوكيز</h2>
      <p>
        تقدر تمسح أو تمنع الكوكيز من إعدادات المتصفح. ملاحظة: منع الكوكيز الأساسية هيخرّجك من
        الحساب وممكن يكسر تسجيل الدخول. منع كوكيز التحليلات مش هيأثر على الوظائف.
      </p>
      <p>روابط سريعة:</p>
      <ul>
        <li>
          <a href="https://support.google.com/chrome/answer/95647?hl=ar" target="_blank" rel="noopener">
            Chrome
          </a>
        </li>
        <li>
          <a href="https://support.apple.com/ar-eg/guide/safari/sfri11471/mac" target="_blank" rel="noopener">
            Safari
          </a>
        </li>
        <li>
          <a href="https://support.mozilla.org/ar/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener">
            Firefox
          </a>
        </li>
      </ul>

      <h2>4. التعديل على السياسة</h2>
      <p>
        لو ضفنا فئة كوكيز جديدة (مثلًا كوكيز تسويق)، هنحدّث الصفحة دي ونطلب موافقتك قبل ما
        نحطها.
      </p>

      <h2>5. التواصل</h2>
      <p>
        أسئلة: <a href="mailto:privacy@dentalmap.app">privacy@dentalmap.app</a>.
      </p>
    </>
  );
}
