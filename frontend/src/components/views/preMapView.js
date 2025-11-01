// /* global google */
// src/components/views/MapView.jsx
// 初期表示は「先頭アイテムの位置 (zoom=12)」で描画 → 直後に geolocation を自動試行（1回）
// ボタン「現在地を使う」でも同ロジック（失敗時は先頭へ戻す）
// 追加: 地図が idle したら /places/map を叩いて「いま見えてる範囲の場所」を追加で描画する

import { useEffect, useRef, useState } from "react";
import { ensureMaps } from "../../lib/maps";
import { fetchPlacesForMap } from "../../lib/api";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

/* ====== 共通ヘルパー ====== */
/** place が lat/lng でも latitude/longitude でも、どっちでも拾う */
function pickLatLng(p) {
  if (!p) return null;
  const lat =
    p.latitude ??
    p.lat ??
    (typeof p.lat === "string" ? parseFloat(p.lat) : undefined);
  const lng =
    p.longitude ??
    p.lng ??
    (typeof p.lng === "string" ? parseFloat(p.lng) : undefined);

  if (
    lat == null ||
    lng == null ||
    Number.isNaN(+lat) ||
    Number.isNaN(+lng)
  ) {
    return null;
  }
  return { lat: +lat, lng: +lng };
}

/* geolocation を1回（Promise化） */
function getCurrentPositionOnce(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEO_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

export default function MapView({ items = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markersRef = useRef([]);
  const markerByIdRef = useRef(new Map()); // idごとに重複を弾く
  const myMarkerRef = useRef(null);

  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");

  // 先頭 or 東京駅
  const firstPos = (() => {
    const firstWithPos = items.find((p) => pickLatLng(p));
    if (firstWithPos) {
      const pos = pickLatLng(firstWithPos);
      return { ...pos, hasFirst: true };
    }
    return { lat: 35.681236, lng: 139.767125, hasFirst: false }; // 東京駅
  })();

  // 初期描画 → 自動 geolocation → idle で /places/map
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureMaps();
        const g = window.google;
        if (!g?.maps || cancelled || !containerRef.current) return;

        const canImport = typeof g.maps.importLibrary === "function";
        const { Map } = canImport
          ? await g.maps.importLibrary("maps")
          : { Map: g.maps.Map };

        const map = new Map(containerRef.current, {
          center: { lat: firstPos.lat, lng: firstPos.lng },
          zoom: firstPos.hasFirst ? 12 : 5,
          ...(MAP_ID ? { mapId: MAP_ID } : {}),
        });
        mapRef.current = map;
        infoRef.current = new g.maps.InfoWindow();

        // 既存マーカーをクリア
        markersRef.current.forEach((m) => m.setMap?.(null));
        markersRef.current = [];
        markerByIdRef.current = new Map();

        // propsから来てる分を先に描画
        const withCoords = items
          .map((p) => ({ place: p, pos: pickLatLng(p) }))
          .filter((x) => x.pos);
        if (withCoords.length > 0) {
          await drawPlaceMarkers(withCoords.map((x) => ({ ...x.place, ...x.pos })));
        }

        // 初回だけ位置を取ってみる
        acquireMyLocation({ fromButton: false });

        // ===== idleで /places/map を取りに行く =====
        let idleTimer = null;
        const handleIdle = () => {
          if (!mapRef.current) return;
          if (idleTimer) clearTimeout(idleTimer);

          idleTimer = setTimeout(async () => {
            const currentMap = mapRef.current;
            if (!currentMap) return;
            const bounds = currentMap.getBounds();
            if (!bounds) return;

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const zoom = currentMap.getZoom();

            try {
              const res = await fetchPlacesForMap({
                nelat: ne.lat(),
                nelng: ne.lng(),
                swlat: sw.lat(),
                swlng: sw.lng(),
                zoom,
                limit: 200,
              });

              const list = Array.isArray(res) ? res : res.data || [];

              // 正常な座標だけに絞る & まだ描画してないidだけにする
              const toAdd = list
                .map((p) => {
                  const pos = pickLatLng(p);
                  if (!pos) return null;
                  return { ...p, ...pos };
                })
                .filter(
                  (p) => p && !markerByIdRef.current.has(p.id)
                );

              if (toAdd.length > 0) {
                await drawPlaceMarkers(toAdd);
              }
            } catch (err) {
              console.warn("[MapView] /places/map failed:", err);
            }
          }, 300);
        };

        g.maps.event.addListener(map, "idle", handleIdle);
        // 初回の範囲でも1回叩いておく
        handleIdle();
      } catch (e) {
        console.error("[MapView] init failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // items が変わったら一度作り直す
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // マーカー描画
  async function drawPlaceMarkers(withCoords) {
    const g = window.google;
    const map = mapRef.current;
    if (!g?.maps || !map || !Array.isArray(withCoords)) return;

    const canImport = typeof g.maps.importLibrary === "function";
    let AdvancedMarkerElement, PinElement;
    if (canImport) {
      const markerLib = await g.maps.importLibrary("marker");
      AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
      PinElement = markerLib.PinElement;
    }

    withCoords.forEach((p) => {
      const pos = pickLatLng(p);
      if (!pos) return;

      // idを記録しておく（/places/mapからの重複を防ぐ）
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
    });
  }

  function openInfo(place, anchor) {
    const g = window.google;
    const info = infoRef.current;
    const map = mapRef.current;
    if (!g?.maps || !info || !map) return;

    info.setContent(buildInfoHtml(place));

    // AdvancedMarker / Marker どちらでも開く
    if (anchor && typeof anchor.addListener === "function") {
      info.open({ map, anchor });
    } else {
      info.open(map, anchor);
    }
  }

  // 位置取得（自動 / ボタン共通）
  async function acquireMyLocation({ fromButton }) {
    const g = window.google;
    const map = mapRef.current;
    if (!g?.maps || !map) return;

    setLocErr("");
    setLocating(true);

    const tryGet = (opts) =>
      getCurrentPositionOnce(opts).then(
        (pos) => ({ ok: true, pos }),
        (err) => ({ ok: false, err })
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

      const pos = {
        lat: got.coords.latitude,
        lng: got.coords.longitude,
      };
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

  return (
    <div className="relative">
      {/* Map本体 */}
      <div ref={containerRef} className="h-96 w-full rounded-xl border" />

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
          title="現在地を使う"
        >
          現在地を使う
        </button>
      </div>

      {/* 右下エラー表示 */}
      {locErr && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-red-600 px-3 py-2 text-sm text-white shadow">
          {locErr}
        </div>
      )}
    </div>
  );
}

/* ====== InfoWindow ====== */

function buildMapsUrl(p) {
  const pos = pickLatLng(p);
  if (p.google_place_id) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
      p.google_place_id
    )}`;
  }
  const addr =
    p.full_address ||
    p.address_line ||
    [p.city, p.state, p.postal_code, p.country].filter(Boolean).join(" ") ||
    "";
  const name = p.name || "";
  const q = [name, addr].filter(Boolean).join(" ");
  if (q.trim()) {
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
