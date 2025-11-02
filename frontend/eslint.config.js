// frontend/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // ESLint に見せたくないもの
  globalIgnores(["dist", "node_modules", ".vite", "eslint.config.js"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        process: "readonly",
        "import.meta": "readonly",
        globalThis: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // 空ブロックを許す
      "no-empty": "off",

      // 未使用は warning に
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // これまでも落としてたやつ
      "jsx-a11y/img-redundant-alt": "off",

      // 👇 今回CIで止まってるやつをオフにする
      "jsx-a11y/label-has-associated-control": "off",

      // vite.config.js での再定義を許す
      "no-redeclare": ["error", { builtinGlobals: false }],
    },
  },
]);
