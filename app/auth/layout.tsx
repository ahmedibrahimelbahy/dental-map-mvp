import { Manrope } from "next/font/google";
import "../globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

/**
 * Layout for the /auth/* subtree (outside the [locale] segment). The
 * locale layout has its own <html>/<body>; this is the parallel one
 * for the OAuth callback route which deliberately doesn't carry a
 * locale prefix.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
