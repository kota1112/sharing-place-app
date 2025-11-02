// frontend/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // ESLint に見せたくないものを最初に除外
  // これを入れておかないと、このファイル自身を ESLint が読んでしまって
  // 「import があるのに CJS として読んでるよ？」になる
  globalIgnores(["dist", "node_modules", ".vite", "eslint.config.js"]),
  {
    files: ["**/*.{js,jsx}"],
    // plugins はここでは定義しない
    // → jsxA11y は extends 側で読み込むだけにする
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
        process: "readonly",
        // ← ここをクォートしないと `Unexpected token '.'` が出る
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
      // 既存の空ブロックを壊さない
      "no-empty": "off",

      // 未使用変数は warning。大文字 or _ 始まりは無視
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // 今回は緩める
      "jsx-a11y/img-redundant-alt": "off",

      // vite.config.js での process などを再定義扱いにしない
      "no-redeclare": ["error", { builtinGlobals: false }],
    },
  },
]);
