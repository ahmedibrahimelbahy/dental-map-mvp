import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function SpecialtiesPage({
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
      title={ar ? "التخصصات" : "Specialties"}
      body={
        ar
          ? "صفحات التخصصات الكاملة (تقويم، تجميل، علاج جذور، إلخ) — مع أطباء موصى بهم لكل تخصص — جاية قريب."
          : "Dedicated pages per specialty (Orthodontics, Cosmetic, Endodontics, etc.) — with top dentists curated for each — are on the way."
      }
      eta={ar ? "الأسبوع 4" : "Week 4"}
    />
  );
}
