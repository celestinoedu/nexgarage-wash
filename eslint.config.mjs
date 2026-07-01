import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["lite/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];

export default config;
