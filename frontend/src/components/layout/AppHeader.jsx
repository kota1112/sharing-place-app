import { useEffect, useState, useCallback } from "react";
import { getToken, clearToken } from "../../lib/api";

export default function AppHeader() {
  const [authed, setAuthed] = useState(
    !!(getToken() || localStorage.getItem("token"))
  );
  const tokenKey = "token";

  // ローカル/別タブの変更やアプリ内イベントで反映
  useEffect(() => {
    const onStorage = (e) => {
      if (!e || e.key === null || e.key === tokenKey) {
        setAuthed(!!(getToken() || localStorage.getItem(tokenKey)));
      }
    };
    const onAuthChanged = () =>
      setAuthed(!!(getToken() || localStorage.getItem(tokenKey)));

    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:changed", onAuthChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:changed", onAuthChanged);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    const token = getToken() || localStorage.getItem(tokenKey);
    try {
      if (token) {
        await fetch(import.meta.env.VITE_API_BASE + "/auth/sign_out", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {}); // 失敗しても続行（トークンは破棄）
      }
    } finally {
      clearToken?.(); // lib/api の clearToken を優先
      localStorage.removeItem(tokenKey);
      setAuthed(false);
      // 他コンポーネントへ通知（ヘッダー/フッターの状態更新）
      window.dispatchEvent(new Event("auth:changed"));
      // ホームへ
      location.assign("/place-homepage");
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-blue-400/90 backdrop-blur supports-[backdrop-filter]:bg-blue-400/70">
      <nav
        aria-label="Primary"
        className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8"
      >
        <div className="min-h-14 flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
          {/* Brand / App name */}
          <a
            href="/place-homepage"
            className="rounded px-1 text-base font-semibold tracking-tight text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-lg"
          >
            Places
          </a>

          {/* Global nav */}
          <ul className="flex items-center gap-3 overflow-x-auto whitespace-nowrap text-sm text-white/90 sm:gap-5 sm:text-base">
            <li>
              <a
                href="/place-homepage"
                className="rounded px-1 py-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Home
              </a>
            </li>

            {/* Post はログイン時のみ表示 */}
            {authed && (
              <li>
                <a
                  href="/place/new"
                  className="rounded px-1 py-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Post
                </a>
              </li>
            )}

            <li>
              <a
                href="/mypage"
                className="rounded px-1 py-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                My Page
              </a>
            </li>
          </ul>

          {/* spacer to push auth to the right */}
          <div className="ml-auto" />

          {/* Auth */}
          <div className="flex items-center gap-3 text-sm sm:text-base">
            {authed ? (
              <button
                onClick={handleLogout}
                className="rounded px-1 py-0.5 text-white/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Log out
              </button>
            ) : (
              <a
                href="/login"
                className="rounded px-1 py-0.5 text-white/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Log in
              </a>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
