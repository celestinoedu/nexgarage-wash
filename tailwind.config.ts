import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        line: "#d8dee8",
        lotus: "#0f766e"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
