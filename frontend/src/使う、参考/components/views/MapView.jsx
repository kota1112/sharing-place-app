// /* global google */
// ホームページ用 MapView（初回でもボタンでも現在地取得／インジケーター表示／堅牢なフォールバック）

import { useEffect, useRef, useState } from "react";
import { ensureMaps } from "../../../lib/maps";

// .env に MAP ID を設定していればベクターマップ + AdvancedMarker
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

/* ========== geolocation 1回だけ（Promise化） ========== */
function getCurrentPositionOnce(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEO_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

/* ========== 前回位置のキャッシュ（ホームページ用キー） ========== */
const LAST_POS_KEY = "homepage:lastpos";
function saveLastPos(lat, lng) {
  try {
    localStorage.setItem(
      LAST_POS_KEY,
      JSON.stringify({ lat, lng, ts: Date.now() })
    );
  } catch {}
}
function loadLastPos() {
  try {
    const j = JSON.parse(localStorage.getItem(LAST_POS_KEY));
    if (j && typeof j.lat === "number" && typeof j.lng === "number") return j;
  } catch {}
  return null;
}

export default function MapView({ items = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markersRef = useRef([]);
  const myMarkerRef = useRef(null);

  // 右上の UI 状態
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");

  /* ========== 初期化：地図生成 → マーカー表示 → 自動で現在地取得 ========== */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureMaps();
        const g = window.google;
        if (!g?.maps || cancelled || !containerRef.current) return;

        // 緯度経度を持つものだけ
        const withCoords = items.filter(
          (p) =>
            p &&
            p.latitude != null &&
            p.longitude != null &&
            !Number.isNaN(+p.latitude) &&
            !Number.isNaN(+p.longitude)
        );

        // 初期センター：先頭 or 東京駅
        const fallbackCenter = withCoords.length
          ? { lat: +withCoords[0].latitude, lng: +withCoords[0].longitude }
          : { lat: 35.681236, lng: 139.767125 }; // 東京駅

        // Map 生成
        const canImport = typeof g.maps.importLibrary === "function";
        const { Map } = canImport
          ? await g.maps.importLibrary("maps")
          : { Map: g.maps.Map };

        const map = new Map(containerRef.current, {
          center: fallbackCenter,
          zoom: withCoords.length ? 12 : 4,
          ...(MAP_ID ? { mapId: MAP_ID } : {}),
          // ページスクロールより地図操作を優先したい場合は "greedy"
          gestureHandling: "auto",
          mapTypeControl: true,
          fullscreenControl: true,
        });
        mapRef.current = map;
        infoRef.current = new g.maps.InfoWindow();

        // 地点マーカー
        await drawPlaceMarkers(withCoords);

        // ★ 初回も現在地取得を試みる（MyPlacesMap と同様の体験）
        //    → インジケーターが表示される
        acquireLocation(false);
      } catch (e) {
        console.error("[MapView] init failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  /* ========== places のマーカーを張る ========== */
  async function drawPlaceMarkers(withCoords) {
    const g = window.google;
    const map = mapRef.current;
    if (!g?.maps || !map) return;

    // 旧マーカー片付け
    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];

    const canImport = typeof g.maps.importLibrary === "function";
    let AdvancedMarkerElement, PinElement;
    if (canImport) {
      const markerLib = await g.maps.importLibrary("marker");
      AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
      PinElement = markerLib.PinElement;
    }

    withCoords.forEach((p) => {
      const position = { lat: +p.latitude, lng: +p.longitude };
      let marker;

      if (AdvancedMarkerElement && PinElement) {
        const pin = new PinElement({
          glyphText: (p.name || "").slice(0, 2).toUpperCase(),
        });
        marker = new AdvancedMarkerElement({
          map,
          position,
          content: pin.element,
          title: p.name || "",
        });
        marker.addListener("gmp-click", () => openInfo(p, marker));
      } else {
        marker = new g.maps.Marker({ map, position, title: p.name || "" });
        marker.addListener("click", () => openInfo(p, marker));
      }

      markersRef.current.push(marker);
    });
  }

  /* ========== InfoWindow を開く ========== */
  function openInfo(place, anchor) {
    const g = window.google;
    const info = infoRef.current;
    const map = mapRef.current;
    if (!g?.maps || !info || !map) return;

    info.setContent(buildInfoHtml(place));
    info.open({ map, anchor });
  }

  /* ========== 現在地取得（自動／ボタン共通ロジック） ========== */
  async function acquireLocation(fromButton = true) {
    const g = window.google;
    const map = mapRef.current;
    if (!g?.maps || !map) return;

    setLocErr("");
    setLocating(true);

    // 失敗時フォールバック：先頭座標
    const first = items.find(
      (p) =>
        p &&
        p.latitude != null &&
        p.longitude != null &&
        !Number.isNaN(+p.latitude) &&
        !Number.isNaN(+p.longitude)
    );
    const firstPos = first
      ? { lat: +first.latitude, lng: +first.longitude }
      : null;

    const tryGet = (opts) =>
      getCurrentPositionOnce(opts).then(
        (pos) => ({ ok: true, pos }),
        (err) => ({ ok: false, err })
      );

    try {
      // MyPlacesMap と同じ「2段階リトライ」ポリシー
      const tries = fromButton
        ? [
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
          ]
        : [
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
          ];

      let got = null;
      for (const t of tries) {
        const r = await tryGet(t);
        if (r.ok) {
          got = r.pos;
          break;
        }
      }

      if (got) {
        const { latitude, longitude } = got.coords;
        const pos = { lat: latitude, lng: longitude };

        // 中心＆ズーム
        map.setCenter(pos);
        map.setZoom(14);

        // 自分のピン
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

        // キャッシュ
        saveLastPos(pos.lat, pos.lng);
        return;
      }

      // 失敗：前回位置 or 先頭アイテム or そのまま
      const last = loadLastPos();
      if (last) {
        map.setCenter({ lat: last.lat, lng: last.lng });
        map.setZoom(14);
        setLocErr("現在地取得に失敗。前回の位置を表示しました。");
      } else if (firstPos) {
        map.setCenter(firstPos);
        map.setZoom(12);
        setLocErr("現在地取得に失敗。先頭の場所を表示しました。");
      } else {
        setLocErr("現在地を取得できませんでした。");
      }
    } finally {
      setLocating(false);
    }
  }

  /* ========== UI ========== */
  return (
    <div className="relative">
      {/* Map 本体 */}
      <div ref={containerRef} className="h-96 w-full rounded-xl border" />

      {/* 右上コントロール（インジケーター＋ボタン） */}
      <div className="pointer-events-none absolute right-3 top-3 flex gap-2">
        {locating && (
          <div className="pointer-events-auto rounded-lg bg-white/95 px-3 py-2 text-sm shadow">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
          onClick={() => acquireLocation(true)}
          disabled={locating}
          className="pointer-events-auto rounded-lg bg-white/95 px-3 py-2 text-sm shadow hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          title="現在地を使う"
        >
          現在地を使う
        </button>
      </div>

      {/* エラー・トースト（右下） */}
      {locErr && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-red-600 px-3 py-2 text-sm text-white shadow">
          {locErr}
        </div>
      )}
    </div>
  );
}

/* ========== InfoWindow の中身（小サムネ＋本文） ========== */

function buildMapsUrl(p) {
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
  if (p.latitude != null && p.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${p.latitude},${p.longitude}`
    )}`;
  }
  return "https://www.google.com/maps";
}

function buildInfoHtml(p) {
  const thumb = p.first_photo_url
    ? `<img src="${escapeHtml(p.first_photo_url)}" alt="${escapeHtml(
        p.name || ""
      )}" style="
            width:72px;height:72px;border-radius:10px;object-fit:cover;
            flex:none;display:block;
        " />`
    : `<div style="
            width:72px;height:72px;border-radius:10px;background:#e5e7eb;
            display:flex;align-items:center;justify-content:center;
            color:#6b7280;font-size:12px;flex:none;
        ">No image</div>`;

  const name = p.name
    ? `<div style="font-weight:700;font-size:14px;line-height:1.3;">
         ${escapeHtml(p.name)}
       </div>`
    : "";

  const addr =
    p.full_address ||
    p.address_line ||
    [p.city, p.state, p.postal_code, p.country].filter(Boolean).join(" ") ||
    "";
  const addrHtml = addr
    ? `<div style="font-size:12px;color:#374151;margin-top:2px;">
         ${escapeHtml(addr)}
       </div>`
    : "";

  const desc = (p.description || "").trim();
  const descShort = desc.length > 60 ? `${desc.slice(0, 60)}…` : desc;
  const descHtml = descShort
    ? `<div style="font-size:12px;color:#111827;margin-top:6px;">
         ${escapeHtml(descShort)}
       </div>`
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
      <a href="/places/${p.id}" style="
           text-decoration:none;background:#111827;color:#fff;
           padding:8px 10px;border-radius:10px;font-size:12px;
         ">詳細を見る</a>
      <a href="${mapsUrl}" target="_blank" rel="noopener" style="
           text-decoration:none;background:#e5e7eb;color:#111827;
           padding:8px 10px;border-radius:10px;font-size:12px;
         ">Google マップで見る</a>
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
