import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api"; // 既存のヘルパ

export default function MyPage() {
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");

    Promise.all([
      api("/auth/me", { signal: ac.signal }),
      api("/places/mine", { signal: ac.signal }),
    ])
      .then(([meRes, places]) => {
        setMe(meRes?.user ?? null);
        setItems(Array.isArray(places) ? places : []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          const msg =
            e?.status === 401
              ? "未ログインです。右上の Log in からサインインしてください。"
              : e?.message || String(e);
          setErr(msg);
        }
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
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24">
      {/* タイトル & アカウント */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Page</h1>
        <p className="mt-1 text-slate-500">
          Account:{" "}
          <span className="font-medium text-slate-700">
            {me?.username ?? me?.email ?? "—"}
          </span>
        </p>
      </header>

      {/* 検索ブロック */}
      <section className="mb-6">
        <label className="mb-2 block text-base font-semibold text-slate-700">検索</label>
        <div className="flex gap-3">
          <input
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="例：渋谷 / 大阪 / 京都駅 など"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="rounded-xl bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-700 active:scale-[0.99]"
            onClick={() => setQ(q)}
          >
            Search
          </button>
        </div>
      </section>

      {/* ステータス */}
      {loading && <div className="text-slate-500">Loading...</div>}
      {!!err && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      )}

      {/* 見出し */}
      {!loading && !err && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">自分が追加した場所</h2>
          <div className="text-sm text-slate-500">
            {filtered.length} / {items.length}
          </div>
        </div>
      )}

      {/* 空表示 */}
      {!loading && !err && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          該当する場所がありません
        </div>
      )}

      {/* リスト */}
      <ul className="grid gap-4">
        {filtered.map((p) => (
          <li key={p.id}>
            <PlaceItem place={p} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function PlaceItem({ place }) {
  // /places/mine が返す first_photo_url を最優先、なければ詳細の photo_urls[0] を保険で使用
  const imgSrc =
    place.first_photo_url ??
    (Array.isArray(place.photo_urls) && place.photo_urls.length > 0 ? place.photo_urls[0] : null);

  return (
    <Link
      to={`/places/${place.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      aria-label={`${place.name} の詳細へ`}
    >
      <article className="flex items-start gap-4">
        {/* サムネイル */}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={place.name}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-[1.01]"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const ph = e.currentTarget.nextSibling;
                if (ph) ph.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`absolute inset-0 grid place-items-center text-xs text-slate-400 ${
              imgSrc ? "hidden" : ""
            }`}
          >
            no photo
          </div>
        </div>

        {/* 本文 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold leading-6 text-slate-900 group-hover:text-blue-700">
              {place.name}
            </h3>
            <span className="text-xs text-slate-400">ID: {place.id}</span>
          </div>
          <div className="mt-1 text-sm text-slate-600">{place.city ?? "-"}</div>
          {place.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{place.description}</p>
          )}
          <div className="mt-2 text-xs font-medium text-blue-600">詳細を見る →</div>
        </div>
      </article>
    </Link>
  );
}
