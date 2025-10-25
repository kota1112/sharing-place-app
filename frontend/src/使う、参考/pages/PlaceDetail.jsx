// /* global google */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ensureMaps } from "../../lib/maps";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

export default function PlaceDetail() {
  const { id } = useParams();
  const [place, setPlace] = useState(null);
  const [err, setErr] = useState("");

  // 取得
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setErr("");
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/places/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!dead) setPlace(json);
      } catch (e) {
        // 先頭 <!doctype の HTML が返ってしまう場合は API ベースURL/Proxy を見直してください
        setErr(
          "読み込みに失敗しました: " +
            (e?.message || "Unknown error") +
            "\n※ 先頭が <!doctype html> の HTML が返る場合、Vite が API の代わりにアプリHTMLを返しています。VITE_API_BASE を確認するか、Vite proxy を設定してください。"
        );
      }
    })();
    return () => {
      dead = true;
    };
  }, [id]);

  if (err) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <pre className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 whitespace-pre-wrap">
          {err}
        </pre>
        <Link to="/place-homepage" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-72 w-full animate-pulse rounded-2xl bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <Link to="/place-homepage" className="text-blue-600 hover:underline">
        ← Back
      </Link>

      <h1 className="text-3xl font-semibold">{place.name}</h1>

      {/* Hero 画像 */}
      {place.photo_urls?.[0] && (
        <img
          src={place.photo_urls[0]}
          alt={place.name}
          className="aspect-[16/6] w-full rounded-2xl object-cover"
        />
      )}

      {/* アドレス・説明 */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Address</h2>
        <p className="text-gray-700">
          {place.full_address ||
            [place.address_line, place.city, place.state, place.postal_code, place.country]
              .filter(Boolean)
              .join(" ")}
        </p>
        {place.description && (
          <>
            <div className="mt-4 h-px w-full bg-gray-100" />
            <p className="mt-4 whitespace-pre-wrap text-gray-800">{place.description}</p>
          </>
        )}
      </section>

      {/* 地図 */}
      <MapSection place={place} />

      {/* 写真一覧 */}
      {place.photo_urls?.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">More photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {place.photo_urls.slice(1).map((url) => (
              <img
                key={url}
                src={url}
                className="aspect-[4/3] w-full rounded-xl object-cover"
                alt=""
                loading="lazy"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** 地図セクション。ref が null の間は絶対に初期化しない */
function MapSection({ place }) {
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Google マップのリンク（座標優先、なければ住所）
  const gmapsUrl = useMemo(() => {
    if (place.latitude != null && place.longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    }
    const q =
      place.full_address ||
      [place.address_line, place.city, place.state, place.postal_code, place.country]
        .filter(Boolean)
        .join(" ");
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
  }, [place]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 座標が無い・DOMがまだ → 何もしない
      if (
        mapRef.current == null ||
        place?.latitude == null ||
        place?.longitude == null
      ) {
        return;
      }

      try {
        await ensureMaps();
        if (cancelled || mapRef.current == null) return;

        const g = window.google;
        const canImport = typeof g.maps.importLibrary === "function";

        const center = { lat: +place.latitude, lng: +place.longitude };
        const opts = { center, zoom: 14, ...(MAP_ID ? { mapId: MAP_ID } : {}) };

        if (canImport) {
          const [{ Map }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
            g.maps.importLibrary("maps"),
            g.maps.importLibrary("marker"),
          ]);
          if (cancelled || mapRef.current == null) return;

          const map = new Map(mapRef.current, opts);
          const pin = new PinElement({ glyph: (place.name || "").slice(0, 2).toUpperCase() });
          new AdvancedMarkerElement({
            map,
            position: center,
            content: pin.element,
            title: place.name || "",
          });
        } else {
          const map = new g.maps.Map(mapRef.current, opts);
          new g.maps.Marker({ map, position: center, title: place.name || "" });
        }

        if (!cancelled) setReady(true);
      } catch (e) {
        console.error("[MapSection] init failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [place?.latitude, place?.longitude, place?.name]);

  return (
    <section className="space-y-3">
      <div
        ref={mapRef}
        className="h-80 w-full rounded-2xl border"
        // ref が null のときに new Map させないのが一番のポイント
      />
      {gmapsUrl && (
        <div className="text-right">
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Google マップで開く
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path
                d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"
                fill="currentColor"
              />
              <path
                d="M5 5h6V3H3v8h2V5zm0 8H3v8h8v-2H5v-6z"
                fill="currentColor"
              />
            </svg>
          </a>
        </div>
      )}
      {!ready && (
        <p className="text-sm text-gray-500">地図を読み込み中…（DOM が準備できてから初期化します）</p>
      )}
    </section>
  );
}
