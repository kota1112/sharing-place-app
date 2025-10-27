// src/pages/MyPage.jsx

import { useEffect, useMemo, useState } from "react";
import { api, getToken } from "../../lib/api";
import MyPlacesList from "../../使う、参考/components/forMypage/MyPlacesList";
import MyPlacesGrid from "../../使う、参考/components/forMypage/MyPlacesGrid";
import MyPlacesMap from "../../使う、参考/components/forMypage/MyPlacesMap";
import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";

// JWT から username をフォールバック取得
function decodeUsernameFromJWT() {
  try {
    const raw = getToken() || localStorage.getItem("token");
    if (!raw || !raw.includes(".")) return null;
    const [, payload] = raw.split(".");
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return (
      json.username ||
      json.preferred_username ||
      json.name ||
      json.email ||
      json.sub ||
      null
    );
  } catch {
    return null;
  }
}

export default function MyPage() {
  const [profile, setProfile] = useState({ username: "—" });
  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("list");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // ① 現在ユーザー
        let me;
        try {
          const res = await api("/auth/me"); // { user: {...} } を想定
          me = res?.user;
        } catch {
          const u = decodeUsernameFromJWT();
          if (u) me = { username: u };
        }
        if (me) {
          const username =
            me.username || me.display_name || me.email || me.id || "—";
          setProfile({ username });
        }

        // ② 自分の場所一覧
        const places = await api("/places/mine");
        setAll(Array.isArray(places) ? places : []);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (!v) return all;
    return all.filter((p) =>
      [p.name, p.full_address, p.address_line, p.city, p.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(v)
    );
  }, [all, q]);

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

        <div className="mb-4">
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 rounded-xl border px-4 py-2 focus:outline-none focus:ring"
              placeholder="例: 渋谷 / 大阪城 / 京都駅 など"
            />
            <button className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Search
            </button>
          </form>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">場所リスト</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {filtered.length} / {all.length}
            </div>
            {Toggle}
          </div>
        </div>

        <section className="min-h-[280px]">
          {loading && <p className="text-gray-500">読み込み中…</p>}
          {!loading && err && <p className="text-red-600">読み込みエラー: {err}</p>}
          {!loading && !err && (
            <>
              {mode === "list" && <MyPlacesList items={filtered} />}
              {mode === "grid" && <MyPlacesGrid items={filtered} />}
              {mode === "map" && <MyPlacesMap items={filtered} greedyScroll={false} />}
            </>
          )}
        </section>
      </div>
      <AppFooter />
    </>
  );
}
