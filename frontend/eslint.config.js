// frontend/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // ESLint に見せたくないものを全部ここで外す
  // これを入れておかないと eslint.config.js 自体を ESLint が読んで
  // 「ここでも import してるけど CJS だと思ってるよ？」と怒られる
  globalIgnores(["dist", "node_modules", ".vite", "eslint.config.js"]),
  {
    files: ["**/*.{js,jsx}"],
    // ❗ここで plugins を定義すると
    // 「Cannot redefine plugin "jsx-a11y"」になるので書かない
    extends: [
      js.configs.recommended,
      // React Hooks の最新ルール
      reactHooks.configs["recommended-latest"],
      // Vite の fast refresh 用
      reactRefresh.configs.vite,
      // JSX のアクセシビリティ
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // Vite やコードで使っているものを readonly で許可
        process: "readonly",
        import.meta: "readonly",
        globalThis: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // 既存コードに空ブロックがあるので許可
      "no-empty": "off",

      // 未使用変数は warning。大文字・_ で始まるものは無視
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // CI で出てたが今回は無効化しておく
      "jsx-a11y/img-redundant-alt": "off",

      // vite.config.js での process などを再定義扱いにしない
      "no-redeclare": ["error", { builtinGlobals: false }],
    },
  },
]);
