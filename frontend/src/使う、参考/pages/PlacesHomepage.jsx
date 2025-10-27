// src/pages/PlacesHomepage.jsx
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import SearchBar from "../components/SearchBar";
import PlacesMain from "../components/PlacesMain";
import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";

import Pager from "../components/Pager";

export default function PlacesHomepage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null); // サーバが total を返す場合に表示用
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("grid"); // 'list' | 'grid' | 'map'
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // /places を叩く（q なし=全件/最新, q あり=サーバーサイド検索）
  const fetchPlaces = useCallback(async (query) => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (query && String(query).trim() !== "") {
        params.set("q", String(query).trim());
      }
      // ページングを使うならここで page/per_page も付与する
      const path = params.toString()
        ? `/places?${params.toString()}`
        : "/places";

      const data = await api(path);

      // 返却が配列 or オブジェクト（{items,total,...}）の両対応
      if (Array.isArray(data)) {
        setItems(data);
        setTotal(null);
      } else if (data && Array.isArray(data.items)) {
        setItems(data.items);
        setTotal(typeof data.total === "number" ? data.total : null);
      } else {
        // 想定外の形でも落ちないように安全側
        setItems([]);
        setTotal(null);
      }
    } catch (e) {
      setErr(String(e?.message || e));
      setItems([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回ロード：全件（qなし）
  useEffect(() => {
    fetchPlaces("");
  }, [fetchPlaces]);

  // 検索実行（SearchBar の「Search」ボタンから呼ばれる）
  const handleSearch = useCallback(() => {
    fetchPlaces(q);
  }, [q, fetchPlaces]);

  return (
    <>
      <AppHeader />
      {/* ヘッダー/フッター固定の分、上下に余白（pt/pb）を足す */}
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-16">
        <h1 className="mb-4 text-2xl font-bold">Places_homepage</h1>

        <div className="mb-4 flex items-center gap-3">
          {/* 入力は状態 q に保存、Search でサーバー問い合わせ */}
          <SearchBar value={q} onChange={setQ} onSubmit={handleSearch} />
          <div className="ml-auto flex gap-1 rounded-xl bg-gray-100 p-1">
            {["list", "grid", "map"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-2 text-sm capitalize transition ${
                  mode === m
                    ? "bg-white shadow-sm"
                    : "text-gray-600 hover:bg-white/70"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 状態表示 */}
        {loading && <div className="text-gray-500">Loading...</div>}

        {!!err && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="text-gray-500">該当する場所がありません。</div>
        )}

        {!loading && !err && items.length > 0 && (
          <>
            {/* total が来ている（サーバーサイド検索対応コントローラ）なら件数を表示 */}
            {typeof total === "number" && (
              <div className="mb-2 text-sm text-gray-500">{total} 件</div>
            )}
            <PlacesMain mode={mode} items={items} />
          </>
        )}
      </main>
      <AppFooter />
    </>
  );
}
