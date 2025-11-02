// frontend/eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // ここで「自分自身」も含めて ESLint に見せたくないものを全部外す
  // ※これを入れないと eslint.config.js 自体を ESLint が読んで
  //   「import があるけどここは CommonJS だと思ってるよ？」って怒る
  globalIgnores(["dist", "node_modules", ".vite", "eslint.config.js"]),
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    extends: [
      js.configs.recommended,
      // React Hooks の最新ルール
      reactHooks.configs["recommended-latest"],
      // Vite の Fast Refresh 用
      reactRefresh.configs.vite,
      // a11y（Post.jsx で怒られていたやつ）
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // あなたのコードで使っているので全部 readonly で許可
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
      // lib/api.js などの空ブロックをそのまま通す
      "no-empty": "off",

      // 未使用変数は warning に落とす（大文字・_ 始まりは無視）
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^[A-Z_]",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // CI で「このルールが無い」となっていたので、ここでは無効化しておく
      "jsx-a11y/img-redundant-alt": "off",

      // vite.config.js で `process` を触っても「再定義」と言われないように
      "no-redeclare": ["error", { builtinGlobals: false }],
    },
  },
]);
