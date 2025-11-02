// frontend/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // ここで「自分自身」を含めて ESLint に見せたくないものを全部外す
  // これがないと eslint.config.js 自体を ESLint が読んで
  // 「import があるけど CJS として読んでるよ？」ってなる
  globalIgnores(["dist", "node_modules", ".vite", "eslint.config.js"]),
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    extends: [
      js.configs.recommended,
      reactHooks.configs["recommended-latest"], // React Hooks
      reactRefresh.configs.vite, // Vite fast refresh
      jsxA11y.flatConfigs.recommended, // a11y
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // ここがポイント：ドット入りはクォートする
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
      // いまの実装にある空ブロックを壊さない
      "no-empty": "off",

      // 未使用変数は warning、大文字・_ 始まりは無視
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // Post.jsx で出たけど今回は無効化
      "jsx-a11y/img-redundant-alt": "off",

      // vite.config.js での process とかを再定義扱いにしない
      "no-redeclare": ["error", { builtinGlobals: false }],
    },
  },
]);
