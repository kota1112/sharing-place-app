// src/pages/PlacesHomepage.jsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import SearchBar from "../components/SearchBar";
import PlacesMain from "../components/PlacesMain";
import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";

// --- 簡易デバウンス ---
function useDebounce(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function PlacesHomepage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [mode, setMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let aborted = false;

    async function fetchPlaces(query) {
      try {
        setLoading(true);
        setErr("");
        const params = new URLSearchParams();
        const trimmed = String(query || "").trim();
        if (trimmed) params.set("q", trimmed);
        const path = params.toString()
          ? `/places?${params.toString()}`
          : "/places";
        const data = await api(path);
        if (aborted) return;

        if (Array.isArray(data)) {
          setItems(data);
          setTotal(null);
        } else if (data && Array.isArray(data.items)) {
          setItems(data.items);
          setTotal(typeof data.total === "number" ? data.total : null);
        } else {
          setItems([]);
          setTotal(null);
        }
      } catch (e) {
        if (!aborted) {
          setErr(String(e?.message || e));
          setItems([]);
          setTotal(null);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchPlaces(debouncedQ);
    return () => {
      aborted = true;
    };
  }, [debouncedQ]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-16">
        <h1 className="mb-4 text-2xl font-bold">Places_homepage</h1>

        <div className="mb-4 flex items-center gap-3">
          {/* ★ サジェストは全体スコープ */}
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="場所名・都市・住所などで検索…"
            suggestPath="/places/suggest"
          />
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
