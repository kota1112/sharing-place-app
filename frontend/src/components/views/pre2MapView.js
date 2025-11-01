// /* global google */
// src/components/views/MapView.jsx
// ホームページ用マップ
// - DOMにrefが刺さってから初期化（StrictModeでも安全）
// - idleごとに /places/map を叩いて「いま見えてる範囲の場所」を追加
// - 何件描画しているかを左上に表示
// - 何件返ってきたかを console に出す（原因切り分け用）

import { useEffect, useRef, useState, useCallback } from "react";
import { ensureMaps } from "../../lib/maps";
import { fetchPlacesForMap } from "../../lib/api";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

/* ===== 共通ユーティリティ ===== */

// geolocation を1回だけ試す
function getCurrentPositionOnce(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEO_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

// items が {lat,lng} / {latitude,longitude} どちらでもOKにする
function hasCoord(p) {
  if (!p) return false;
  const lat = p.latitude ?? p.lat;
  const lng = p.longitude ?? p.lng;
  return lat != null && lng != null && !Number.isNaN(+lat) && !Number.isNaN(+lng);
}
function toPosition(p) {
  return {
    lat: +(p.latitude ?? p.lat),
    lng: +(p.longitude ?? p.lng),
  };
}

export default function MapView({ items = [] }) {
  // 実DOM
  const [mapDiv, setMapDiv] = useState(null);

  // Google Map 関連
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const myMarkerRef = useRef(null);

  // 描画中のマーカー
  const markersRef = useRef([]);
  // id -> true で「このidはもう置いたよ」を覚えておく
  const markerByIdRef = useRef(new Map());

  // UI状態
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [markerCount, setMarkerCount] = useState(0); // ← 左上に表示する用

  // 初期中心（props.items の先頭か東京駅）
  const firstPos = (() => {
    const first = items.find((p) => hasCoord(p));
    return first
      ? { ...toPosition(first), hasFirst: true }
      : { lat: 35.681236, lng: 139.767125, hasFirst: false };
  })();

  // ref にコールバックを設定
  const containerRefCb = useCallback((node) => {
    setMapDiv(node || null);
  }, []);

  /* ================= 1. 初期化（divができたら1回だけ） ================= */
  useEffect(() => {
    if (!mapDiv) return; // まだDOMがない

    let cancelled = false;

    (async () => {
      try {
        await ensureMaps();
        if (cancelled) return;

        const g = window.google;
        if (!g?.maps) return;

        const canImport = typeof g.maps.importLibrary === "function";
        const { Map } = canImport
          ? await g.maps.importLibrary("maps")
          : { Map: g.maps.Map };

        if (cancelled) return;

        // ← ここでは mapDiv は必ず HTMLElement
        const map = new Map(mapDiv, {
          center: { lat: firstPos.lat, lng: firstPos.lng },
          zoom: firstPos.hasFirst ? 12 : 5,
          ...(MAP_ID ? { mapId: MAP_ID } : {}),
        });

        mapRef.current = map;
        infoRef.current = new g.maps.InfoWindow();

        // いま props で来ている items を一度描画
        const initial = items.filter((p) => hasCoord(p));
        await drawPlaceMarkers(initial, map);

        // 現在地を自動で一度試す（失敗してもOK）
        acquireMyLocation({ fromButton: false });

        // idle で /places/map を叩く
        let idleTimer = null;
        const handleIdle = () => {
          if (!mapRef.current) return;
          if (idleTimer) clearTimeout(idleTimer);

          idleTimer = setTimeout(async () => {
            const m = mapRef.current;
            if (!m) return;

            const bounds = m.getBounds();
            if (!bounds) return;

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const zoom = m.getZoom();

            try {
              const res = await fetchPlacesForMap({
                nelat: ne.lat(),
                nelng: ne.lng(),
                swlat: sw.lat(),
                swlng: sw.lng(),
                zoom,
                limit: 200,
              });

              // Rails側の返し方が {data: [...]} でも [...] でも吸収
              const list = Array.isArray(res) ? res : res?.data || [];

              // ← ここをコンソールに出すことで「本当はいくつ返ってるのか」が分かる
              console.log(
                "[MapView] /places/map response:",
                Array.isArray(list) ? list.length : 0,
                list
              );

              const valid = list.filter((p) => hasCoord(p));

              // すでに同じidを置いていたらスキップ
              const toAdd = valid.filter((p) => {
                if (p.id == null) return true;
                return !markerByIdRef.current.has(p.id);
              });

              if (toAdd.length) {
                await drawPlaceMarkers(toAdd, m);
              }
            } catch (err) {
              console.warn("[MapView] /places/map failed:", err);
            }
          }, 300);
        };

        g.maps.event.addListener(map, "idle", handleIdle);
        // 初回も1回だけ呼んでおく
        handleIdle();
      } catch (e) {
        console.error("[MapView] init failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapDiv]); // ← divが差し替わったときだけ

  /* ================= 2. props.items が変わったときに「足す」 ================= */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const withCoords = items.filter((p) => hasCoord(p));
    if (!withCoords.length) return;

    const toAdd = withCoords.filter((p) => {
      if (p.id == null) return true;
      return !markerByIdRef.current.has(p.id);
    });

    if (toAdd.length) {
      drawPlaceMarkers(toAdd, map);
    }
  }, [items]);

  /* ================= マーカー描画 ================= */
  async function drawPlaceMarkers(list, map) {
    const g = window.google;
    if (!g?.maps || !map || !Array.isArray(list) || !list.length) return;

    const canImport = typeof g.maps.importLibrary === "function";
    let AdvancedMarkerElement, PinElement;
    if (canImport) {
      const markerLib = await g.maps.importLibrary("marker");
      AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
      PinElement = markerLib.PinElement;
    }

    for (const p of list) {
      if (!hasCoord(p)) continue;
      const pos = toPosition(p);

      // id を覚えておく（次に /places/map から同じidが来たら弾ける）
      if (p.id != null) {
        markerByIdRef.current.set(p.id, true);
      }

      let marker;
      if (AdvancedMarkerElement && PinElement) {
        const pin = new PinElement({
          glyphText: (p.name || "").slice(0, 2).toUpperCase(),
        });
        marker = new AdvancedMarkerElement({
          map,
          position: pos,
          content: pin.element,
          title: p.name || "",
        });
        marker.addListener("gmp-click", () => openInfo(p, marker));
      } else {
        marker = new g.maps.Marker({
          map,
          position: pos,
          title: p.name || "",
        });
        marker.addListener("click", () => openInfo(p, marker));
      }

      markersRef.current.push(marker);
    }

    // 左上に出す件数を更新
    setMarkerCount(markersRef.current.length);
  }

  /* ================= InfoWindow ================= */
  function openInfo(place, anchor) {
    const g = window.google;
    const info = infoRef.current;
    const map = mapRef.current;
    if (!g?.maps || !info || !map) return;

    info.setContent(buildInfoHtml(place));

    if (anchor && typeof anchor.addListener === "function") {
      info.open({ map, anchor });
    } else {
      info.open(map, anchor);
    }
  }

  /* ================= 現在地取得 ================= */
  async function acquireMyLocation({ fromButton }) {
    const g = window.google;
    const map = mapRef.current;
    if (!g?.maps || !map) return;

    setLocErr("");
    setLocating(true);

    const tryGet = (opts) =>
      getCurrentPositionOnce(opts).then(
        (pos) => ({ ok: true, pos }),
        () => ({ ok: false })
      );

    try {
      const tries = [
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      ];

      let got = null;
      for (const t of tries) {
        const r = await tryGet(t);
        if (r.ok) {
          got = r.pos;
          break;
        }
      }

      if (!got) {
        if (firstPos.hasFirst) {
          map.setCenter({ lat: firstPos.lat, lng: firstPos.lng });
          map.setZoom(12);
        }
        if (fromButton) {
          setLocErr("位置情報を取得できませんでした。先頭の場所を表示します。");
        }
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
        const { AdvancedMarkerElement, PinElement } =
          await g.maps.importLibrary("marker");
        const pin = new PinElement({
          glyphText: "ME",
          background: "#2563eb",
          glyphColor: "#fff",
        });
        myMarkerRef.current = new AdvancedMarkerElement({
          map,
          position: pos,
          content: pin.element,
          title: "You are here",
        });
      } else {
        myMarkerRef.current = new g.maps.Marker({
          map,
          position: pos,
          title: "You are here",
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
          },
        });
      }
    } finally {
      setLocating(false);
    }
  }

  /* ================= JSX ================= */
  return (
    <div className="relative">
      {/* マップ本体 */}
      <div ref={containerRefCb} className="h-96 w-full rounded-xl border" />

      {/* ← いま描画してるマーカー数を見たいので左上に出す */}
      <div className="pointer-events-none absolute left-3 top-3 rounded bg-white/90 px-3 py-1 text-xs text-gray-700 shadow">
        マーカー: {markerCount} 件
      </div>

      {/* 右上コントロール */}
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
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
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
          onClick={() => acquireMyLocation({ fromButton: true })}
          disabled={locating}
          className="pointer-events-auto rounded-lg bg-white/95 px-3 py-2 text-sm shadow hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          現在地を使う
        </button>
      </div>

      {/* 右下エラー */}
      {locErr && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-red-600 px-3 py-2 text-sm text-white shadow">
          {locErr}
        </div>
      )}
    </div>
  );
}

/* ====== InfoWindow builder ====== */

function buildMapsUrl(p) {
  const pos = hasCoord(p) ? toPosition(p) : null;
  const addr =
    p.full_address ||
    p.address ||
    p.address_line ||
    [p.city, p.state, p.postal_code, p.country].filter(Boolean).join(" ") ||
    "";
  const name = p.name || "";
  const q = [name, addr].filter(Boolean).join(" ").trim();

  if (q) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      q
    )}`;
  }

  if (pos) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${pos.lat},${pos.lng}`
    )}`;
  }

  return "https://www.google.com/maps";
}

function buildInfoHtml(p) {
  const thumb = p.first_photo_url
    ? `<img src="${escapeHtml(p.first_photo_url)}" alt="${escapeHtml(
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
    p.address ||
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
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
      ${p.id ? `<a href="/places/${p.id}" style="text-decoration:none;background:#111827;color:#fff;padding:8px 10px;border-radius:10px;font-size:12px;">詳細を見る</a>` : ""}
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
