import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F1E8",
        paper: "#FBF6EC",
        ink: "#1A1612",
        spruce: {
          50: "#EDF3EF",
          100: "#D6E2DA",
          200: "#AEC4B6",
          300: "#7FA08B",
          400: "#517E65",
          500: "#3D6F55",
          600: "#2B533F",
          700: "#1F3D2E",
          800: "#14291F",
          900: "#0B1A13",
        },
        copper: {
          50: "#FBEFE6",
          100: "#F4D7BF",
          200: "#E9B48A",
          300: "#DF995E",
          400: "#D87A45",
          500: "#C86B3B",
          600: "#A9562C",
          700: "#854220",
          800: "#5F2F17",
          900: "#3C1D0D",
        },
        fog: "#A89E91",
        mist: "#D9D1C4",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        display: "-0.035em",
        tight2: "-0.025em",
        smallcaps: "0.22em",
      },
      boxShadow: {
        card: "0 1px 0 rgba(31,61,46,0.06), 0 2px 6px -2px rgba(31,61,46,0.08), 0 14px 40px -18px rgba(31,61,46,0.18)",
        "card-hover":
          "0 1px 0 rgba(31,61,46,0.08), 0 4px 10px -2px rgba(31,61,46,0.10), 0 24px 60px -20px rgba(31,61,46,0.24)",
      },
      animation: {
        rise: "rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
