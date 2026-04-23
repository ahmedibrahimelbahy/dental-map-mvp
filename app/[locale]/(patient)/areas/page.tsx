import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function AreasPage({
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
      title={ar ? "مناطق القاهرة" : "Cairo areas"}
      body={
        ar
          ? "خريطة تفاعلية للقاهرة الكبرى مقسمة بالأحياء، يمكنك الضغط على حي لترى الأطباء المتاحين فيه."
          : "An interactive map of Greater Cairo split by district — tap a district to jump into the filtered list of dentists available there."
      }
      eta={ar ? "الأسبوع 5" : "Week 5"}
    />
  );
}
