import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals.map((cfg) => {
    if (cfg.plugins && cfg.plugins["react-hooks"]) {
      return {
        ...cfg,
        rules: {
          ...cfg.rules,
          "react-hooks/set-state-in-effect": "off",
          "react-hooks/immutability": "off",
        },
      };
    }
    return cfg;
  }),
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
]);

export default eslintConfig;
