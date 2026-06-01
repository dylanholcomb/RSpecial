import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // -----------------------------------------------------------------
        // Listening habit colors — CANONICAL ECHO palette
        // -----------------------------------------------------------------
        // Per Allison's SME correction (May 26, 2026), these colors mirror
        // the official ECHO profile report exactly. Do not change without
        // SME sign-off — these are LQ brand colors, not arbitrary picks.
        //
        //   CV (Connective) — green
        //   RV (Reflective) — blue
        //   AL (Analytical) — gray
        //   CL (Conceptual) — purple
        // -----------------------------------------------------------------
        habit: {
          connective: "#10B981",   // green   — relational
          reflective: "#3B82F6",   // blue    — emotional / experiential
          analytical: "#6B7280",   // gray    — logic / data
          conceptual: "#A855F7",   // purple  — vision / ideation
        },
        ink: {
          900: "#0F1419",
          700: "#2A2F3A",
          500: "#5A6173",
          300: "#9AA1B0",
          100: "#E5E7EC",
        },
        canvas: {
          base: "#FAFAF7",
          card: "#FFFFFF",
          subtle: "#F2F1EB",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["ui-serif", "Georgia", "Cambria", "serif"],
      },
      maxWidth: {
        "mobile": "30rem", // 480px — mobile-first content max
      },
    },
  },
  plugins: [],
};

export default config;
