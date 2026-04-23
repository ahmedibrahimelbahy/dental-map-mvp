import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Dental Map", template: "%s · Dental Map" },
  description:
    "Egypt's booking engine for dentists — live availability, verified reviews, Arabic-first.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
