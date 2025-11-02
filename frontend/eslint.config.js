// frontend/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // ビルド成果物は無視
  globalIgnores(["dist", "node_modules", ".vite"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      // React Hooks の最新ルール
      reactHooks.configs["recommended-latest"],
      // Vite 用の fast refresh
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      // ブラウザ + Vite で使ってるものをグローバルにしておく
      globals: {
        ...globals.browser,
        // Vite の設定ファイルや一部コードで使っていたので追加
        process: "readonly",
        // 念のため
        globalThis: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // いまのコードにある「空の {}」を許可（lib/api.js とか）
      "no-empty": "off",

      // 使ってない変数で落とさない。大文字や _ で始まるものは無視。
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // CI が「このルールが無い」と言っていたので明示的にオフ
      "jsx-a11y/img-redundant-alt": "off",
    },
  },
]);
