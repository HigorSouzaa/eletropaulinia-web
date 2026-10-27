import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".next/**", ".netlify/**", "legacy/**", "next-env.d.ts", "test-results/**", "playwright-report/**"] },
  {
    files: ["backend/**/*.js", "shared/**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,

    },
    rules: {
      ...reactHooks.configs.recommended.rules,

    },
  }
);
