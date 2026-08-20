import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102A43",
        line: "#D9E2EC",
        lotus: "#0369A1",
        wash: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
          950: "#082F49"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 76, 117, 0.08)",
        float: "0 16px 44px rgba(2, 132, 199, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
