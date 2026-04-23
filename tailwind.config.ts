import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand teal — sampled from the Dental Map logo pin
        teal: {
          50: "#E7F7F4",
          100: "#C6EDE6",
          200: "#9DDFD3",
          300: "#6FD0BD",
          400: "#3FBFA6",
          500: "#1EA58F",
          600: "#128074",
          700: "#0E6458",
          800: "#0B4B42",
          900: "#08332D",
        },
        // Ink — sampled from the "Map" wordmark
        ink: {
          50: "#F6F8FA",
          100: "#E4E7EB",
          200: "#CBD1D9",
          300: "#A1ABB8",
          400: "#6C7787",
          500: "#475568",
          600: "#334155",
          700: "#1F2A3C",
          800: "#162132",
          900: "#0F1B2A",
        },
        // Soft surface for alternating sections
        surface: "#F6FAFA",
        // Coral accent — used sparingly for "offer"/"new" badges
        coral: {
          100: "#FDE4DB",
          500: "#F2704E",
          600: "#D65735",
        },
      },
      fontFamily: {
        display: [
          "var(--font-jakarta)",
          "var(--font-cairo)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "var(--font-manrope)",
          "var(--font-cairo)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        display: "-0.03em",
        tight2: "-0.02em",
        smallcaps: "0.14em",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,42,0.04), 0 6px 18px -8px rgba(15,27,42,0.10)",
        "card-hover":
          "0 2px 4px rgba(15,27,42,0.05), 0 16px 40px -12px rgba(15,27,42,0.18)",
        search:
          "0 2px 4px rgba(15,27,42,0.04), 0 20px 60px -18px rgba(15,27,42,0.20)",
        "teal-glow": "0 10px 30px -14px rgba(30,165,143,0.45)",
      },
      animation: {
        rise: "rise 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "teal-gradient":
          "linear-gradient(135deg, #1EA58F 0%, #128074 100%)",
        "hero-wash":
          "radial-gradient(60% 50% at 20% 10%, rgba(30,165,143,0.08) 0%, transparent 60%), radial-gradient(50% 40% at 90% 20%, rgba(30,165,143,0.06) 0%, transparent 65%)",
      },
    },
  },
  plugins: [],
};

export default config;
