// src/pages/MyPage.jsx
import { useEffect, useState } from "react";
import { api, getToken } from "../../lib/api";
import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";
import SearchBar from "../components/SearchBar"; // 矢印キー対応版
import MyPlacesList from "../../使う、参考/components/forMypage/MyPlacesList";
import MyPlacesGrid from "../../使う、参考/components/forMypage/MyPlacesGrid";
import MyPlacesMap from "../../使う、参考/components/forMypage/MyPlacesMap";

// JWT → username フォールバック
function decodeUsernameFromJWT() {
  try {
    const raw = getToken() || localStorage.getItem("token");
    if (!raw || !raw.includes(".")) return null;
    const [, payload] = raw.split(".");
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.username || json.preferred_username || json.name || json.email || json.sub || null;
  } catch {
    return null;
  }
}

// デバウンス
function useDebounce(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function MyPage() {
  const [profile, setProfile] = useState({ username: "—" });
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [mode, setMode] = useState("list");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 初回プロフィール
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        let me;
        try {
          const res = await api("/auth/me");
          me = res?.user;
        } catch {
          const u = decodeUsernameFromJWT();
          if (u) me = { username: u };
        }
        if (me) {
          const username = me.username || me.display_name || me.email || me.id || "—";
          setProfile({ username });
        }
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 検索（自分のデータ）
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const v = debouncedQ.trim();
        const url = v ? `/places/mine?q=${encodeURIComponent(v)}` : "/places/mine";
        const data = await api(url);
        if (!aborted) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!aborted) setErr(e.message || String(e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [debouncedQ]);

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
        <header className="mb-8">
          <h1 className="text-3xl font-bold">My Page</h1>
          <div className="text-gray-500">
            Account: <span className="font-semibold">{profile.username}</span>
          </div>
        </header>

        {/* ★ サジェストは自分のデータのみ */}
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
              {mode === "list" && <MyPlacesList items={items} />}
              {mode === "grid" && <MyPlacesGrid items={items} />}
              {mode === "map" && <MyPlacesMap items={items} greedyScroll={false} />}
            </>
          )}
        </section>
      </div>
      <AppFooter />
    </>
  );
}
