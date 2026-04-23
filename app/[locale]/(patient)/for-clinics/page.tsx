import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function ForClinicsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ar = locale === "ar";
  return (
    <PlaceholderPage
      label={ar ? "قريباً" : "Coming soon"}
      title={ar ? "للعيادات" : "For clinics"}
      body={
        ar
          ? "انضم لتجربة دنتال ماب الأولى في القاهرة. بنتكامل مع أجندة Dentolize اللي بتستخدمها فعلاً — بدون إعادة إدخال. اكتب لنا وبنجهز العيادة في نفس اليوم."
          : "Join the Dental Map Cairo pilot. We plug into the Dentolize calendar you already use — no double entry. Reach out and we'll onboard your clinic same-day."
      }
      eta={ar ? "الأسبوع 2" : "Week 2"}
    />
  );
}
