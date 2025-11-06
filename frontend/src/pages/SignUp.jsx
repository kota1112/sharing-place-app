// src/pages/SignUp.jsx
import { useEffect, useRef, useState } from "react";
import { setToken } from "../lib/api";
import { googleLogin } from "../lib/api"; // GIS の id_token をサーバへ送信してサインアップ/ログイン

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID; // .env に設定

export default function SignUp() {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const gsiBtnRef = useRef(null);
  const initedRef = useRef(false);
  const [gsiReady, setGsiReady] = useState(false);

  // ===== Google Sign-Up (Google Identity Services) =====
  useEffect(() => {
    // index.html に GIS スクリプトを読み込んでいる前提:
    // <script src="https://accounts.google.com/gsi/client" async defer></script>
    if (initedRef.current) return;
    const g = window.google?.accounts?.id;
    if (!g || !GOOGLE_CLIENT_ID || !gsiBtnRef.current) return;

    const onCredential = async (resp) => {
      if (!resp?.credential) return;
      setErr("");
      setGLoading(true);
      try {
        // バックエンド: POST /auth/google に id_token を投げる
        await googleLogin(resp.credential);

        // サインアップ後の遷移先（?redirect= があれば優先）
        const params = new URLSearchParams(location.search);
        const redirect = params.get("redirect") || "/";
        location.replace(redirect);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setGLoading(false);
      }
    };

    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: onCredential,
      auto_select: false,
      ux_mode: "popup",
      context: "signup", // 表示テキスト上のヒント
    });

    // 公式ボタンの描画（幅は style で 100% 指定）
    g.renderButton(gsiBtnRef.current, {
      theme: "outline",
      size: "large",
      text: "signup_with",
      shape: "rectangular",
      // width は CSS/inline-style で設定する
    });

    initedRef.current = true;
    setGsiReady(true);

    return () => {
      // StrictMode 等の二重初期化対策のためクリーンアップ
      try {
        window.google?.accounts?.id?.disableAutoSelect?.();
        window.google?.accounts?.id?.cancel?.();
      } catch {
        // ignore
      }
    };
  }, []);

  // ===== 既存のメール+パスワードでのサインアップ =====
  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");

    try {
      const fd = new FormData(e.currentTarget);
      const email = fd.get("email");
      const password = fd.get("password");
      const password_confirmation = fd.get("password_confirmation");

      // 1) サインアップ（/auth）— 成功してもJWTは発行されない想定
      const res = await fetch(`${API_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          user: { email, password, password_confirmation },
        }),
      });

      if (!res.ok) {
        let msg = "Sign up failed";
        try {
          const data = await res.json();
          msg = data?.errors?.join("\n") || data?.error || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      // 2) 直後にサインインしてJWTを取得（/auth/sign_in）
      const res2 = await fetch(`${API_BASE}/auth/sign_in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          "user[email]": email,
          "user[password]": password,
        }),
      });

      const auth = res2.headers.get("Authorization");
      if (!res2.ok || !auth) {
        // 自動ログイン失敗時はログイン画面へ誘導
        alert("Signed up, but auto login failed. Please sign in manually.");
        location.href = "/login";
        return;
      }

      setToken(auth.replace(/^Bearer\s+/i, ""));
      location.replace("/");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create your account</h1>

      {err && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-red-700 text-sm whitespace-pre-line">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="email"
          type="email"
          required
          className="border p-2 w-full rounded-md"
          placeholder="Email"
          autoComplete="email"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="border p-2 w-full rounded-md"
          placeholder="Password"
          autoComplete="new-password"
        />
        <input
          name="password_confirmation"
          type="password"
          required
          minLength={6}
          className="border p-2 w-full rounded-md"
          placeholder="Confirm password"
          autoComplete="new-password"
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 w-full rounded-md disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Creating..." : "Sign up"}
        </button>

        {/* 区切り */}
        <div className="flex items-center gap-3 my-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Google Sign-Up（サインアップ兼ログイン） */}
        <div className="space-y-2">
          <div ref={gsiBtnRef} className="flex justify-center" style={{ width: "100%" }} />
          {!gsiReady && (
            <button
              type="button"
              disabled
              className="w-full rounded-md border px-4 py-2 text-sm disabled:opacity-60"
              title={
                !GOOGLE_CLIENT_ID
                  ? "VITE_GOOGLE_CLIENT_ID が未設定です"
                  : "Loading Google Sign-In..."
              }
            >
              {gLoading ? "Connecting..." : "Sign up with Google"}
            </button>
          )}
          <p className="text-[11px] text-gray-500 text-center">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>

        {/* ここから：サインアップせずにホームへ */}
        <div className="flex items-center gap-3 my-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <a
          href="/"
          className="w-full block text-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Continue without account
        </a>
        {/* ここまで */}

        <div className="text-sm text-gray-500 text-center">
          Already have an account?{" "}
          <a className="underline" href="/login">
            Log in
          </a>
        </div>
      </form>
    </main>
  );
}
