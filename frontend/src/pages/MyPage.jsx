// src/pages/MyPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";

import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";
import SearchBar from "../components/SearchBar";

import MyPlacesList from "../components/forMypage/MyPlacesList";
import MyPlacesGrid from "../components/forMypage/MyPlacesGrid";
import MyPlacesMap from "../components/forMypage/MyPlacesMap";

import {
  api,
  fetchMyPlaces,        // ← ページネーション対応版
  deletePlaceSoft,
  getToken,
} from "../lib/api";

/* =========================
 * JWT フォールバック（数値IDだけの sub は使わない）
 * ========================= */
function decodeUsernameFromJWT() {
  try {
    const raw = getToken() || localStorage.getItem("token");
    if (!raw || !raw.includes(".")) return null;
    const [, payload] = raw.split(".");
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );

    const candidate =
      json.username ||
      json.preferred_username ||
      json.name ||
      json.email ||
      json.sub ||
      null;

    // 数値だけ（例: "1", "42"）は名前として不適切なので捨てる
    if (candidate != null && /^\d+$/.test(String(candidate).trim()))
      return null;

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

  // 一覧データ
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);

  // ページネーション
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PER = 50;
  const [total, setTotal] = useState(null); // APIのtotalを表示用に保存

  // 表示モード
  const [mode, setMode] = useState("list"); // 'list' | 'grid' | 'map'

  // ローディングとエラー
  const [loading, setLoading] = useState(authed);
  const [err, setErr] = useState("");

  // ===== プロフィール取得（/auth/me 優先 → JWT フォールバック） =====
  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        let username = "—";
        try {
          const res = await api("/auth/me");
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

  // ===== /places/mine を1ページ分読む関数 =====
  const loadPage = useCallback(
    async (nextPage, query, { replace } = { replace: false }) => {
      if (!authed) return;
      setLoading(true);
      setErr("");

      try {
        const res = await fetchMyPlaces({
          page: nextPage,
          per: PER,
          q: (query || "").trim(),
        });

        // Rails側は { data: [...], meta: {...} } を返す実装にしている
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const meta = res?.meta || {};

        if (replace) {
          setItems(data);
        } else {
          // 追加読み込み
          setItems((prev) => [...prev, ...data]);
        }

        const totalPages = meta.total_pages || 1;
        setHasMore(nextPage < totalPages);
        setPage(nextPage);
        setTotal(typeof meta.total === "number" ? meta.total : null);
      } catch (e) {
        setErr(e?.message || String(e));
        // エラー時は追加しない
      } finally {
        setLoading(false);
      }
    },
    [authed]
  );

  // ===== 検索語が確定したら1ページ目から読み直し =====
  useEffect(() => {
    if (!authed) return;
    // 検索が変わったので 1ページ目から
    setPage(1);
    loadPage(1, debouncedQ, { replace: true });
  }, [debouncedQ, authed, loadPage]);

  // ===== 削除 =====
  const handleDelete = async (id) => {
    if (!authed) return;
    try {
      await deletePlaceSoft(id);
      // 削除後は「今の検索条件で1ページ目から」再取得
      setPage(1);
      await loadPage(1, debouncedQ, { replace: true });
    } catch (e) {
      alert(`削除に失敗しました: ${e?.message || e}`);
    }
  };

  // ===== 編集 =====
  const handleEdit = (id) => navigate(`/places/${id}/edit`);

  // ===== トグルUI =====
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

        {/* ログインしているときの本体 */}
        {authed && (
          <>
            {/* 検索バー（自分の登録だけサジェスト） */}
            <div className="mb-4">
              <SearchBar
                value={q}
                onChange={setQ}
                placeholder="自分の登録から検索…（例: 渋谷 / 大阪城 / 京都駅）"
                suggestPath="/places/suggest_mine"
              />
            </div>

            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">場所リスト</h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  {total != null ? `${items.length} / ${total}` : items.length}
                </div>
                {Toggle}
              </div>
            </div>

            <section className="min-h-[280px]">
              {loading && items.length === 0 && (
                <p className="text-gray-500">読み込み中…</p>
              )}
              {!loading && err && (
                <p className="text-red-600">読み込みエラー: {err}</p>
              )}

              {!err && (
                <>
                  {mode === "list" && (
                    <MyPlacesList
                      items={items}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}
                  {mode === "grid" && (
                    <MyPlacesGrid
                      items={items}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
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

              {/* もっと見る（まだページがあるときだけ） */}
              {!err && hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => loadPage(page + 1, debouncedQ, { replace: false })}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                    disabled={loading}
                  >
                    {loading ? "読み込み中…" : "もっと見る"}
                  </button>
                </div>
              )}

              {/* データが0件のとき */}
              {!loading && !err && items.length === 0 && (
                <p className="text-gray-400">該当する場所はありませんでした。</p>
              )}
            </section>
          </>
        )}
      </div>
      <AppFooter />
    </>
  );
}
