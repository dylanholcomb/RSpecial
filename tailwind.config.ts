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
        // Listening habit colors — used as accent throughout the app.
        habit: {
          connective: "#E07A5F",   // warm coral — relational
          reflective: "#81B29A",   // sage — emotional
          analytical: "#3D5A80",   // deep blue — logic
          conceptual: "#9B5DE5",   // violet — vision
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
