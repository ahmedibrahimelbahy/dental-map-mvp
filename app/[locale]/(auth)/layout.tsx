import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-[1200px] w-full mx-auto px-6 md:px-10 pt-8 flex items-center justify-between">
        <BrandMark />
        <LocaleSwitcher />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
