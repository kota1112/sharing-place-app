import { useEffect, useMemo, useState } from "react";
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
      const text = `${p.name ?? ""} ${p.city ?? ""} ${
        p.description ?? ""
      }`.toLowerCase();
      return text.includes(needle);
    });
  }, [items, q]);

  return (
    <main className="page">
      <h1 className="title">Places</h1>

      <div className="searchRow">
        <input
          className="input"
          placeholder="例: 渋谷 / 大阪 / cafe など"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn" onClick={() => setQ(q)}>
          Search
        </button>
      </div>

      {loading && <div className="muted">Loading...</div>}
      {!!err && (
        <div className="error">
          読み込みに失敗しました。
          <br />
          <code>{err}</code>
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="empty">該当する場所がありません。</div>
      )}

      <div className="list">
        {filtered.map((p) => (
          <PlaceItem key={p.id} place={p} />
        ))}
      </div>
    </main>
  );
}

function PlaceItem({ place }) {
  // バックエンドが lead_photo_url を返す場合に表示
  const imgSrc = place.lead_photo_url || null;

  return (
    <article className="card">
      <div className="thumb">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={place.name}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              // 画像取得に失敗したらフォールバック
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "grid";
            }}
          />
        ) : null}
        <div
          className="placeholder"
          style={{ display: imgSrc ? "none" : "grid" }}
        >
          no photo
        </div>
      </div>

      <div className="meta">
        <div className="name">{place.name}</div>
        <div className="sub">{place.city ?? "-"}</div>
        {place.description && <div className="desc">{place.description}</div>}
      </div>

      <div className="id">ID: {place.id}</div>
    </article>
  );
}
