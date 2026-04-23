import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function SearchPage({
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
      title={ar ? "نتائج البحث" : "Search results"}
      body={
        ar
          ? "بنبني صفحة البحث دلوقتي — قائمة أطباء موثقين بجانب خريطة تفاعلية لمواقع العيادات. بنضيف عيادات التجربة أول بأول."
          : "We're building the search page right now — a list of verified dentists alongside an interactive map of clinic locations. Adding pilot clinics now."
      }
      eta={ar ? "الأسبوع 3" : "Week 3"}
    />
  );
}
