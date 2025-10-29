// src/pages/LogIn.jsx
import { useState } from "react";
import { setToken } from "../lib/api";

export default function LogIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");

    try {
      // Devise + devise-jwt : /auth/sign_in に form-urlencoded で送信
      const res = await fetch(import.meta.env.VITE_API_BASE + "/auth/sign_in", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
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
          msg = data?.errors?.join("\n") || data?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      setToken(auth.replace("Bearer ", ""));
      // リダイレクト先: ?redirect=/foo があればそこへ、なければ /place-homepage
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect") || "/place-homepage";
      location.replace(redirect);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {/* ここから：ログインせずにホームへ */}
        <div className="flex items-center gap-3 my-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <a
          href="/place-homepage"
          className="w-full block text-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Continue without account
        </a>
        {/* ここまで */}

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
