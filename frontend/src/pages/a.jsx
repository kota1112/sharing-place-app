import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function A() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");
    api("/places", { signal: ac.signal })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) => {
        if (e.name !== "AbortError") setErr(String(e?.message || e));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((p) => {
      const text = `${p.name ?? ""} ${p.city ?? ""} ${p.description ?? ""}`.toLowerCase();
      return text.includes(needle);
    });
  }, [items, q]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Places_homepage</h1>

      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="例: 渋谷 / 大阪 / cafe など"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 active:scale-[.99]"
          onClick={() => setQ(q)}
        >
          Search
        </button>
      </div>

      {loading && <SkeletonList />}

      {!!err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          読み込みに失敗しました。<br />
          <code className="text-xs">{err}</code>
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          該当する場所がありません。
        </div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <PlaceCard place={p} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function PlaceCard({ place }) {
  const [imgSrc, setImgSrc] = useState(
    place.first_photo_url ??
      (Array.isArray(place.photo_urls) ? place.photo_urls[0] : null) ??
      null
  );
  const [triedDetail, setTriedDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchDetailIfNeeded() {
      if (imgSrc || triedDetail) return;
      try {
        setTriedDetail(true);
        const detail = await api(`/places/${place.id}`);
        const url = (Array.isArray(detail.photo_urls) && detail.photo_urls[0]) || null;
        if (!cancelled) setImgSrc(url);
      } catch (_) { /* フォールバック */ }
    }
    fetchDetailIfNeeded();
    return () => { cancelled = true; };
  }, [imgSrc, triedDetail, place.id]);

  return (
    <Link
      to={`/places/${place.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-2xl"
    >
      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition group-hover:shadow-md">
        <div className="relative">
          <div className="aspect-[4/3] w-full bg-gray-100">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={place.name}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-[1.01]"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const ph = e.currentTarget.nextSibling;
                  if (ph) ph.style.display = "grid";
                }}
              />
            ) : null}
            <div
              className="hidden h-full w-full place-items-center text-xs text-gray-500"
              style={{ display: imgSrc ? "none" : "grid" }}
            >
              no photo
            </div>
          </div>

          <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200">
            ID: {place.id}
          </div>
        </div>

        <div className="grid gap-1 p-4">
          <h3 className="line-clamp-1 font-semibold text-gray-900 group-hover:text-indigo-700">
            {place.name}
          </h3>
          <div className="text-sm text-gray-500">{place.city ?? "-"}</div>
          {place.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-700">
              {place.description}
            </p>
          )}
          <div className="mt-2 text-xs font-medium text-indigo-600">
            詳細を見る →
          </div>
        </div>
      </article>
    </Link>
  );
}

function SkeletonList() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white"
        >
          <div className="aspect-[4/3] w-full bg-gray-100" />
          <div className="p-4">
            <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
            <div className="h-3 w-1/3 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-5/6 rounded bg-gray-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}
