// src/pages/LogIn.jsx
import { useEffect, useRef, useState } from "react";
import {
  setToken,
  googleLogin,
  requestPasswordReset,
  requestGooglePasswordReset,
} from "../lib/api";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID; // .env で設定

export default function LogIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [err, setErr] = useState("");

  // ↓ 追加：パスワード忘れパネル用
  const [showForgot, setShowForgot] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const gsiBtnRef = useRef(null);
  const initedRef = useRef(false);
  const [gsiReady, setGsiReady] = useState(false);

  // ====== Google Sign-In (Google Identity Services) 初期化 ======
  useEffect(() => {
    if (initedRef.current) return;
    const g = window.google?.accounts?.id;
    if (!g || !GOOGLE_CLIENT_ID || !gsiBtnRef.current) return;

    const onCredential = async (resp) => {
      if (!resp?.credential) return;
      setErr("");
      setGLoading(true);
      setResetMsg("");
      try {
        await googleLogin(resp.credential);
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
      context: "signin",
    });

    g.renderButton(gsiBtnRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
    });

    initedRef.current = true;
    setGsiReady(true);

    return () => {
      try {
        window.google?.accounts?.id?.disableAutoSelect?.();
        window.google?.accounts?.id?.cancel?.();
      } catch {
        // ignore
      }
    };
  }, []);

  // ====== 既存: メール/パスワード ログイン ======
  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");
    setResetMsg("");

    try {
      const res = await fetch(`${API_BASE}/auth/sign_in`, {
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

      const auth = res.headers.get("Authorization");
      if (!res.ok || !auth) {
        let msg = "Log in failed";
        try {
          const data = await res.json();
          msg =
            data?.errors?.join("\n") ||
            data?.error ||
            data?.message ||
            msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      setToken(auth.replace(/^Bearer\s+/i, ""));
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect") || "/";
      location.replace(redirect);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ====== 追加: Forgot password のハンドラ ======
  async function handleNormalReset() {
    if (!email) {
      setErr("Please fill email first.");
      setShowForgot(true);
      return;
    }
    setResetLoading(true);
    setErr("");
    setResetMsg("");
    try {
      await requestPasswordReset(email);
      setResetMsg("Password reset email has been sent.");
    } catch (e) {
      setErr(e.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleGoogleReset() {
    if (!email) {
      setErr("Please fill email first.");
      setShowForgot(true);
      return;
    }
    setResetLoading(true);
    setErr("");
    setResetMsg("");
    try {
      await requestGooglePasswordReset(email);
      setResetMsg("Reset link was sent to your Google-linked email.");
    } catch (e) {
      // サーバ側が「google_not_linked」などを返したらここで表示される
      setErr(e.message || "Google-linked reset failed");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Log in</h1>

      {err && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-red-700 text-sm whitespace-pre-line">
          {err}
        </div>
      )}
      {resetMsg && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-2 text-green-700 text-sm whitespace-pre-line">
          {resetMsg}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Password</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type={showPw ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full rounded-md border p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="rounded-md border px-2 py-1 text-sm"
              aria-pressed={showPw}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {/* Forgot password toggle */}
        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowForgot((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showForgot ? "Close password help" : "Forgot password?"}
          </button>
        </div>

        {showForgot && (
          <div className="rounded-md border bg-gray-50 p-3 space-y-2">
            <p className="text-xs text-gray-600">
              Choose how to reset your password.
            </p>
            <button
              type="button"
              onClick={handleNormalReset}
              disabled={resetLoading}
              className="w-full rounded-md bg-white border px-3 py-2 text-sm text-left disabled:opacity-60"
            >
              ① Send normal reset email
            </button>
            <button
              type="button"
              onClick={handleGoogleReset}
              disabled={resetLoading}
              className="w-full rounded-md bg-white border px-3 py-2 text-sm text-left disabled:opacity-60"
            >
              ② Send reset to Google-linked account
            </button>
            <p className="text-[10px] text-gray-400">
              * (2) works only if this email is already linked with Google.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {/* 区切り */}
        <div className="flex items-center gap-3 my-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* ===== Google Sign-In ボタン（GIS） ===== */}
        <div className="space-y-2">
          <div ref={gsiBtnRef} className="flex justify-center" style={{ width: "100%" }} />
          {!gsiReady && (
            <button
              type="button"
              disabled
              className="w-full rounded-md border px-4 py-2 text-sm disabled:opacity-60"
              title={
                !GOOGLE_CLIENT_ID
                  ? "VITE_GOOGLE_CLIENT_ID is not set"
                  : "Loading Google Sign-In..."
              }
            >
              {gLoading ? "Connecting..." : "Sign in with Google"}
            </button>
          )}
        </div>

        {/* ここから：ログインせずにホームへ */}
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

        <div className="text-center text-sm text-gray-500">
          Don’t have an account?{" "}
          <a className="underline" href="/signup">
            Sign up
          </a>
        </div>
      </form>
    </main>
  );
}
