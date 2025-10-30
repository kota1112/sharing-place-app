// src/pages/MyPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";
import SearchBar from "../components/SearchBar";

import MyPlacesList from "../components/forMypage/MyPlacesList";
import MyPlacesGrid from "../components/forMypage/MyPlacesGrid";
import MyPlacesMap from "../components/forMypage/MyPlacesMap";

// ← 元のコードでは "../../lib/api" になっていましたが
// MyPage.jsx が src/pages/ 配下にある前提なら "../lib/api" が正しいはずなので直しておきます。
// もし本当に2つ上にあるならだけ "../../" に戻してください。
import { api, getMyPlaces, deletePlaceSoft, getToken } from "../../lib/api";

/* =========================
 * JWT フォールバック（数値IDだけの sub は使わない）
 * ========================= */
function decodeUsernameFromJWT() {
  try {
    const raw = getToken() || localStorage.getItem("token");
    if (!raw || !raw.includes(".")) return null;
    const [, payload] = raw.split(".");
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));

    const candidate =
      json.username ||
      json.preferred_username ||
      json.name ||
      json.email ||
      json.sub ||
      null;

    // 数値だけ（例: "1", "42"）は名前として不適切なので捨てる
    if (candidate != null && /^\d+$/.test(String(candidate).trim())) return null;

    return candidate || null;
  } catch {
    return null;
  }
}

/* =========================
 * デバウンス
 * ========================= */
function useDebounce(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function MyPage() {
  const navigate = useNavigate();
  const authed = !!(getToken() || localStorage.getItem("token"));

  const [profile, setProfile] = useState({ username: "—" });
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);

  const [mode, setMode] = useState("list"); // 'list' | 'grid' | 'map'
  const [loading, setLoading] = useState(authed); // 未ログインなら読み込み表示しない
  const [err, setErr] = useState("");

  // ===== プロフィール取得（/auth/me 優先 → JWT フォールバック） =====
  useEffect(() => {
    if (!authed) return; // 未ログイン時は取得しない
    (async () => {
      try {
        let username = "—";
        try {
          const res = await api("/auth/me"); // 成功すればここを最優先
          const u = res?.user || {};
          username =
            u.username ||
            u.display_name ||
            u.email ||
            u.name ||
            (u.sub && !/^\d+$/.test(String(u.sub)) ? u.sub : null) ||
            "—";
        } catch {
          // 失敗時は JWT からのフォールバック
          username = decodeUsernameFromJWT() || "—";
        }
        setProfile({ username });
      } catch {
        setProfile({ username: "—" });
      }
    })();
  }, [authed]);

  // ===== 自分の Places 取得 =====
  async function loadMine(keyword = "") {
    if (!authed) return; // 未ログイン時は呼ばない
    setLoading(true);
    setErr("");
    try {
      const params = {};
      const v = (keyword || "").trim();
      if (v) params.q = v;
      const data = await getMyPlaces(params);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed) loadMine(debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, authed]);

  // ===== ハンドラ =====
  const handleEdit = (id) => navigate(`/places/${id}/edit`);

  const handleDelete = async (id) => {
    try {
      await deletePlaceSoft(id); // ソフトデリート
      await loadMine(debouncedQ); // 再読込
    } catch (e) {
      alert(`削除に失敗しました: ${e?.message || e}`);
    }
  };

  const Toggle = (
    <div className="flex gap-2">
      {["list", "grid", "map"].map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={
            "rounded-lg border px-3 py-1.5 text-sm transition hover:bg-gray-50 " +
            (mode === m ? "border-gray-900 bg-gray-900 text-white" : "")
          }
        >
          {m[0].toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-16">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Page</h1>
            <div className="text-gray-500">
              Account: <span className="font-semibold">{profile.username}</span>
            </div>
          </div>

          {/* ←ここを追加：マイページからアカウント設定に飛ぶボタン */}
          {authed && (
            <Link
              to="/account/settings"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              アカウント設定へ
            </Link>
          )}
        </header>

        {/* 未ログインの案内表示 */}
        {!authed && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="mb-2 font-medium">データがありません。</p>
            <p className="text-sm text-slate-600">
              My Page と Post を利用するには、アカウントを登録してサインインしてください。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Sign up
              </a>
              <a
                href="/login"
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                Log in
              </a>
              <a
                href="/place-homepage"
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                ホームを見る
              </a>
            </div>
          </div>
        )}

        {/* 自分の登録のみをサジェスト（ログイン時のみ表示） */}
        {authed && (
          <>
            <div className="mb-4">
              <SearchBar
                value={q}
                onChange={setQ}
                placeholder="自分の登録から検索…（例: 渋谷 / 大阪城 / 京都駅）"
                suggestPath="/places/suggest_mine"
              />
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">場所リスト</h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">{items.length}</div>
                {Toggle}
              </div>
            </div>

            <section className="min-h-[280px]">
              {loading && <p className="text-gray-500">読み込み中…</p>}
              {!loading && err && <p className="text-red-600">読み込みエラー: {err}</p>}
              {!loading && !err && (
                <>
                  {mode === "list" && (
                    <MyPlacesList items={items} onEdit={handleEdit} onDelete={handleDelete} />
                  )}
                  {mode === "grid" && (
                    <MyPlacesGrid items={items} onEdit={handleEdit} onDelete={handleDelete} />
                  )}
                  {mode === "map" && (
                    <MyPlacesMap
                      items={items}
                      greedyScroll={false}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
      <AppFooter />
    </>
  );
}
