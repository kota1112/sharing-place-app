import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default ({ mode }) => {
  // .env, .env.local, .env.production などを読む
  const env = loadEnv(mode, process.cwd(), "");

  return defineConfig({
    plugins: [react()],
    // 本番ビルドをちょっとだけ安全寄りに
    build: {
      sourcemap: false, // 本番でソースマップ公開しない
    },
    define: {
      // フロントからAPIのベースURLを参照できるようにする
      // 例: VITE_API_BASE=https://api.example.com
      __API_BASE__: JSON.stringify(env.VITE_API_BASE || "http://localhost:3000"),
    },
    // 開発中にViteが走るポートを固定したい場合はこのへんで
    // （今使ってないなら消してOK）
    server: {
      host: true,
      port: Number(env.VITE_PORT || 5173),
    },
  });
};
