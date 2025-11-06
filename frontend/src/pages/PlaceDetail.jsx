// src/pages/PlaceDetail.jsx
// /* global google */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ensureMaps } from "../lib/maps";
import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

export default function PlaceDetail() {
  const { id } = useParams();
  const [place, setPlace] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setErr("");
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/places/${id}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!dead) setPlace(json);
      } catch (e) {
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
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-16">
          <pre className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </pre>
          <Link
            to="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            ← Back
          </Link>
        </div>
        <AppFooter />
      </>
    );
  }

  if (!place) {
    return (
      <>
        <AppHeader />
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-16">
          <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-72 w-full animate-pulse rounded-2xl bg-gray-200" />
        </div>
        <AppFooter />
      </>
    );
  }

  const fullAddress =
    place.full_address ||
    [
      place.address_line,
      place.city,
      place.state,
      place.postal_code,
      place.country,
    ]
      .filter(Boolean)
      .join(" ");

  // Maps URL（ホーム/マイページと同じルール + 別名フォールバック）
  const gmapsUrlTop = buildMapsUrl(place);

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-16 space-y-8">
        <Link to="/" className="text-blue-600 hover:underline">
          ← Back
        </Link>

        <h1 className="break-words text-3xl font-semibold">{place.name}</h1>

        {place.photo_urls?.[0] && (
          <img
            src={place.photo_urls[0]}
            alt={place.name}
            className="aspect-[16/6] w-full rounded-2xl object-cover"
          />
        )}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">Address</h2>
          <p className="break-words text-gray-700">{fullAddress}</p>
          {place.description && (
            <>
              <div className="mt-4 h-px w-full bg-gray-100" />
              <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-gray-800">
                {place.description}
              </p>
            </>
          )}

          {/* 地図の外に固定のリンク */}
          {gmapsUrlTop && (
            <div className="mt-4 text-right">
              <a
                href={gmapsUrlTop}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                title="Google マップで開く"
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
        </section>

        <MapSection place={place} />

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
      <AppFooter />
    </>
  );
}

/* ================= Map（ホーム/マイページの実装を踏襲） ================= */

function MapSection({ place }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markerRef = useRef(null);
  const myMarkerRef = useRef(null);

  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");

  const hasCoords =
    place?.latitude != null &&
    place?.longitude != null &&
    !Number.isNaN(+place.latitude) &&
    !Number.isNaN(+place.longitude);

  const gmapsUrl = useMemo(() => buildMapsUrl(place), [place]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasCoords || !containerRef.current) return;

      try {
        await ensureMaps();
        const g = window.google;
        if (!g?.maps || cancelled) return;

        const canImport = typeof g.maps.importLibrary === "function";
        const { Map } = canImport
          ? await g.maps.importLibrary("maps")
          : { Map: g.maps.Map };

        const center = { lat: +place.latitude, lng: +place.longitude };
        const map = new Map(containerRef.current, {
          center,
          zoom: 14,
          ...(MAP_ID ? { mapId: MAP_ID } : {}),
          gestureHandling: "greedy", // スクロール制限バナーを抑止
          mapTypeControl: true,
          fullscreenControl: true,
        });
        mapRef.current = map;
        infoRef.current = new g.maps.InfoWindow();

        // マーカー（クリックで InfoWindow）
        if (markerRef.current) {
          markerRef.current.setMap?.(null);
          markerRef.current = null;
        }

        if (canImport) {
          const { AdvancedMarkerElement, PinElement } =
            await g.maps.importLibrary("marker");
          const pin = new PinElement({
            glyphText: (place.name || "").slice(0, 2).toUpperCase(),
          });
          const adv = new AdvancedMarkerElement({
            map,
            position: center,
            content: pin.element,
            title: place.name || "",
          });
          adv.addListener("gmp-click", () =>
            openInfo(place, adv, map, infoRef.current)
          );
          markerRef.current = adv;
        } else {
          const m = new g.maps.Marker({
            map,
            position: center,
            title: place.name || "",
          });
          m.addListener("click", () =>
            openInfo(place, m, map, infoRef.current)
          );
          markerRef.current = m;
        }
      } catch (e) {
        console.error("[PlaceDetail.Map] init failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, place?.id, place?.name, place?.latitude, place?.longitude]);

  // 現在地取得（任意）
  async function useMyLocation() {
    const g = window.google;
    const map = mapRef.current;
    if (!g?.maps || !map) return;

    setLocErr("");
    setLocating(true);

    const tryGet = (opts) =>
      new Promise((resolve) => {
        if (!("geolocation" in navigator)) return resolve({ ok: false });
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ ok: true, pos }),
          () => resolve({ ok: false }),
          opts
        );
      });

    try {
      let got = null;
      for (const opts of [
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      ]) {
        const r = await tryGet(opts);
        if (r.ok) {
          got = r.pos;
          break;
        }
      }
      if (!got) {
        setLocErr("位置情報を取得できませんでした。");
        return;
      }
      const pos = { lat: got.coords.latitude, lng: got.coords.longitude };
      map.setCenter(pos);
      map.setZoom(14);

      if (myMarkerRef.current) {
        myMarkerRef.current.setMap?.(null);
        myMarkerRef.current = null;
      }

      const canImport = typeof g.maps.importLibrary === "function";
      if (canImport) {
        const { AdvancedMarkerElement } = await g.maps.importLibrary("marker");
        const el = document.createElement("div");
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "50%";
        el.style.background = "#1a73e8";
        el.style.boxShadow = "0 0 0 6px rgba(26,115,232,0.25)";
        myMarkerRef.current = new AdvancedMarkerElement({
          map,
          position: pos,
          content: el,
          title: "現在地",
        });
      } else {
        myMarkerRef.current = new g.maps.Marker({
          map,
          position: pos,
          title: "現在地",
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#1a73e8",
            fillOpacity: 1,
            strokeWeight: 8,
            strokeOpacity: 0.25,
            strokeColor: "#1a73e8",
          },
        });
      }
    } finally {
      setLocating(false);
    }
  }

  if (!hasCoords) {
    return (
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Map</h2>
        <p className="text-gray-600">
          この場所の地図情報は登録されていません。
        </p>
        {gmapsUrl && (
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Google マップで開く
          </a>
        )}
      </section>
    );
  }

  return (
    <section className="relative">
      <div ref={containerRef} className="h-96 w-full rounded-2xl border" />
      <div className="pointer-events-none absolute right-3 top-3 flex gap-2">
        {locating && (
          <div className="pointer-events-auto rounded-lg bg-white/95 px-3 py-2 text-sm shadow">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              位置情報を取得中…
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="pointer-events-auto rounded-lg bg-white/95 px-3 py-2 text-sm shadow hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          title="現在地を使う"
        >
          現在地を使う
        </button>
      </div>

      {locErr && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-red-600 px-3 py-2 text-sm text-white shadow">
          {locErr}
        </div>
      )}
    </section>
  );
}

/* ================= Utilities（ホーム/マイページと同一 + 別名対応） ================= */

function buildMapsUrl(p) {
  if (!p) return null;

  // 別名も含めて place_id を拾う
  const gpid =
    p.google_place_id || p.googlePlaceId || p.place_id || p.placeId || null;

  // place_id があればビジネス詳細をダイレクトに開く
  if (gpid) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
      gpid
    )}`;
  }

  const addr =
    p.full_address ||
    p.address_line ||
    [p.city, p.state, p.postal_code, p.country].filter(Boolean).join(" ") ||
    "";

  // 名称 + 住所での検索は Place に当たりやすい
  const name = p.name || "";
  const q = [name, addr].filter(Boolean).join(" ").trim();
  if (q) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      q
    )}`;
  }

  if (p.latitude != null && p.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${p.latitude},${p.longitude}`
    )}`;
  }

  return "https://www.google.com/maps";
}

function openInfo(place, anchor, map, info) {
  if (!map || !info) return;
  info.setContent(buildInfoHtml(place));
  info.open({ map, anchor });
}

function buildInfoHtml(p) {
  const firstPhoto =
    p.first_photo_url || (Array.isArray(p.photo_urls) ? p.photo_urls[0] : null);

  const thumb = firstPhoto
    ? `<img src="${escapeHtml(firstPhoto)}" alt="${escapeHtml(
        p.name || ""
      )}" style="width:72px;height:72px;border-radius:10px;object-fit:cover;flex:none;display:block;" />`
    : `<div style="width:72px;height:72px;border-radius:10px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:12px;flex:none;">No image</div>`;

  const name = p.name
    ? `<div style="font-weight:700;font-size:14px;line-height:1.3;">${escapeHtml(
        p.name
      )}</div>`
    : "";

  const addr =
    p.full_address ||
    p.address_line ||
    [p.city, p.state, p.postal_code, p.country].filter(Boolean).join(" ") ||
    "";
  const addrHtml = addr
    ? `<div style="font-size:12px;color:#374151;margin-top:2px;">${escapeHtml(
        addr
      )}</div>`
    : "";

  const desc = (p.description || "").trim();
  const descShort = desc.length > 60 ? `${desc.slice(0, 60)}…` : desc;
  const descHtml = descShort
    ? `<div style="font-size:12px;color:#111827;margin-top:6px;">${escapeHtml(
        descShort
      )}</div>`
    : "";

  const mapsUrl = buildMapsUrl(p);

  return `
  <div style="width:260px;padding:12px 12px 10px;border-radius:14px;">
    <div style="display:flex;gap:10px;">
      ${thumb}
      <div style="min-width:0;flex:1 1 auto;">
        ${name}
        ${addrHtml}
        ${descHtml}
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;">
      <a href="/places/${p.id}" style="text-decoration:none;background:#111827;color:#fff;padding:8px 10px;border-radius:10px;font-size:12px;">詳細を見る</a>
      <a href="${mapsUrl}" target="_blank" rel="noopener" style="text-decoration:none;background:#e5e7eb;color:#111827;padding:8px 10px;border-radius:10px;font-size:12px;">Google マップで見る</a>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
