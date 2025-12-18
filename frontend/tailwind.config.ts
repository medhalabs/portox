import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8db",
          100: "#ffefb0",
          200: "#ffe27a",
          300: "#ffd147",
          400: "#ffbf1f",
          500: "#f5a800",
          600: "#cc8500",
          700: "#a66300",
          800: "#7d4500",
          900: "#4a2600"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,191,31,0.25), 0 12px 40px rgba(0,0,0,0.55)",
        card: "0 0 0 1px rgba(30,41,59,0.75), 0 18px 55px rgba(0,0,0,0.55)"
      }
    }
  },
  plugins: []
} satisfies Config;


