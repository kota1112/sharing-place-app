// src/pages/SignUp.jsx
import { setToken } from "../lib/api";

export default function SignUp() {
  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email");
    const password = fd.get("password");
    const password_confirmation = fd.get("password_confirmation");

    // 1) サインアップ（/auth）— 成功してもJWTは発行されない設定
    const res = await fetch(import.meta.env.VITE_API_BASE + "/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: { email, password, password_confirmation },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.errors?.join("\n") || "Sign up failed");
      return;
    }

    // 2) 直後にサインインしてJWTを取得（/auth/sign_in）
    const res2 = await fetch(import.meta.env.VITE_API_BASE + "/auth/sign_in", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams({
        "user[email]": email,
        "user[password]": password,
      }),
    });

    const auth = res2.headers.get("Authorization");
    if (!res2.ok || !auth) {
      alert("Signed up, but auto login failed. Please sign in manually.");
      location.href = "/login";
      return;
    }

    setToken(auth.replace("Bearer ", ""));
    location.href = "/place-homepage"; // ログイン後の遷移先
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create your account</h1>

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

        <button className="bg-blue-600 text-white px-4 py-2 w-full rounded-md">
          Sign up
        </button>

        {/* ここから：サインアップせずにホームへ */}
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
