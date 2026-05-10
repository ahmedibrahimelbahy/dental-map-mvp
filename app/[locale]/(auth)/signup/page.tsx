import { setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/components/auth/signup-form";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignUpForm />;
}
