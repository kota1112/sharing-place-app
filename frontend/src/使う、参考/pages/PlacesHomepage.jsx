import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import SearchBar from "../components/SearchBar";
import PlacesMain from "../components/PlacesMain";
import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";

export default function PlacesHomepage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("grid"); // 'list' | 'grid' | 'map'
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");
    api("/places", { signal: ac.signal })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return items;
    return items.filter((p) =>
      `${p.name ?? ""} ${p.city ?? ""} ${p.description ?? ""}`
        .toLowerCase()
        .includes(n)
    );
  }, [items, q]);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-16">
        <h1 className="mb-4 text-2xl font-bold">Places_homepage</h1>

        <div className="mb-4 flex items-center gap-3">
          <SearchBar value={q} onChange={setQ} onSubmit={() => {}} />
          <div className="ml-auto flex gap-1 rounded-xl bg-gray-100 p-1">
            {["list", "grid", "map"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-2 text-sm capitalize transition ${
                  mode === m ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/70"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-gray-500">Loading...</div>}
        {!!err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}
        {!loading && !err && filtered.length === 0 && (
          <div className="text-gray-500">該当する場所がありません。</div>
        )}

        {!loading && !err && filtered.length > 0 && (
          <PlacesMain mode={mode} items={filtered} />
        )}
      </main>
      <AppFooter />
    </>
  );
}
