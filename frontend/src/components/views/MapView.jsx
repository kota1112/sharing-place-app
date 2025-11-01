// src/components/views/MapView.jsx
// ホームページ用のマップ
// - MyPageで動いている MyPlacesMap.jsx をベースにしている
// - 右上に「現在地を使う」ボタン
// - idle のたびに /places/map を叩いて、いま見えている範囲の場所を追加で描画
// - すでに描画してある id は重複させない
// - クラスタライブラリ(@googlemaps/markerclusterer)があれば使う、なければ素で載せる
// - 編集・削除ボタンなど MyPage 専用のUIは全部削除してある

import { useEffect, useRef } from "react";
import { ensureMaps } from "../../lib/maps";
import { fetchPlacesForMap } from "../../lib/api";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

/** geolocation を1回だけ試す（Promiseラップ） */
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
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;

    let map;
    let info;
    let meMarker;
    let btnDiv;
    let spinnerDiv;
    let toastDiv;
    let advanced = false;

    // id → { data, marker }
    const markerById = new Map();

    // クラスタ管理
    let clusterer = null;

    (async () => {
      await ensureMaps();
      if (cancelled || !ref.current) return;

      const g = window.google;
      const canImport = typeof g.maps.importLibrary === "function";

      // 初期中心（items の先頭に座標があるもの → なければ東京駅）
      const first = items.find(
        (p) =>
          p &&
          (p.latitude != null || p.lat != null) &&
          (p.longitude != null || p.lng != null)
      );
      const firstLat =
        first && (first.latitude ?? first.lat) != null
          ? Number(first.latitude ?? first.lat)
          : 35.681236;
      const firstLng =
        first && (first.longitude ?? first.lng) != null
          ? Number(first.longitude ?? first.lng)
          : 139.767125;

      const mapOpts = {
        center: { lat: firstLat, lng: firstLng },
        zoom: first ? 12 : 5,
        ...(MAP_ID ? { mapId: MAP_ID } : {}),
        gestureHandling: "greedy",
        mapTypeControl: true,
        fullscreenControl: true,
      };

      if (canImport) {
        const { Map } = await g.maps.importLibrary("maps");
        map = new Map(ref.current, mapOpts);
        advanced = true;
      } else {
        map = new g.maps.Map(ref.current, mapOpts);
      }

      info = new g.maps.InfoWindow();

      /* ===== InfoWindow を開く共通 ===== */
      const openInfo = (place, anchor) => {
        if (!info) return;
        info.setContent(buildInfoHtml(place));

        // AdvancedMarker と普通の Marker で分岐
        if (anchor && typeof anchor.addListener === "function") {
          info.open({ map, anchor });
        } else {
          info.open(map, anchor);
        }
      };

      /* ===== 通常 Marker を作る ===== */
      function createPlainMarker(place) {
        const latRaw = place.latitude ?? place.lat;
        const lngRaw = place.longitude ?? place.lng;
        const lat = Number(latRaw);
        const lng = Number(lngRaw);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          return null;
        }

        const marker = new g.maps.Marker({
          position: { lat, lng },
          title: place.name || "",
          // クラスタに渡すのでここでは map をセットしない
        });
        marker.addListener("click", () => openInfo(place, marker));
        return marker;
      }

      /* ===== 初期アイテムを載せる ===== */
      const initialValid = items.filter(
        (p) =>
          p &&
          (p.latitude != null || p.lat != null) &&
          (p.longitude != null || p.lng != null)
      );
      for (const p of initialValid) {
        const id = p.id ?? p.place_id;
        if (id != null && markerById.has(id)) continue;
        const m = createPlainMarker(p);
        if (!m) continue;
        if (id != null) {
          markerById.set(id, { data: p, marker: m });
        } else {
          markerById.set(Symbol(), { data: p, marker: m });
        }
      }

      /* ===== 現在地ボタン & トースト ===== */
      btnDiv = document.createElement("div");
      Object.assign(btnDiv.style, {
        background: "#fff",
        borderRadius: "8px",
        padding: "8px 12px",
        margin: "10px",
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        fontSize: "13px",
        userSelect: "none",
        pointerEvents: "auto",
      });
      btnDiv.textContent = "現在地を使う";
      map.controls[g.maps.ControlPosition.TOP_RIGHT].push(btnDiv);

      spinnerDiv = document.createElement("div");
      spinnerDiv.style.cssText =
        "display:none;background:rgba(255,255,255,0.95);padding:8px 10px;margin:10px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:12px;";
      spinnerDiv.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:3px solid #cbd5e1;border-top-color:#334155;border-radius:50%;margin-right:6px;vertical-align:-2px;animation:spin 1s linear infinite"></span>位置情報を取得中…`;
      map.controls[g.maps.ControlPosition.TOP_RIGHT].push(spinnerDiv);

      toastDiv = document.createElement("div");
      Object.assign(toastDiv.style, {
        position: "absolute",
        right: "10px",
        bottom: "10px",
        background: "rgba(220,38,38,0.95)",
        color: "#fff",
        padding: "8px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        zIndex: "9999",
        display: "none",
      });
      ref.current.appendChild(toastDiv);
      const showToast = (msg, ms = 2200) => {
        toastDiv.textContent = msg;
        toastDiv.style.display = "block";
        setTimeout(() => (toastDiv.style.display = "none"), ms);
      };

      const setBusy = (busy) => {
        btnDiv.textContent = busy ? "取得中…" : "現在地を使う";
        btnDiv.style.opacity = busy ? "0.7" : "1";
        btnDiv.style.pointerEvents = busy ? "none" : "auto";
        spinnerDiv.style.display = busy ? "block" : "none";
      };

      const showMe = (lat, lng) => {
        const pos = { lat, lng };
        if (meMarker) {
          if (advanced) meMarker.position = pos;
          else meMarker.setPosition(pos);
        } else {
          if (advanced) {
            (async () => {
              const { AdvancedMarkerElement } = await g.maps.importLibrary(
                "marker"
              );
              const el = document.createElement("div");
              el.style.width = "12px";
              el.style.height = "12px";
              el.style.borderRadius = "50%";
              el.style.background = "#1a73e8";
              el.style.boxShadow = "0 0 0 6px rgba(26,115,232,0.25)";
              meMarker = new AdvancedMarkerElement({
                map,
                position: pos,
                content: el,
                title: "現在地",
              });
            })();
          } else {
            meMarker = new g.maps.Marker({
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
        }
        map.panTo(pos);
        map.setZoom(Math.max(map.getZoom(), 14));
      };

      async function acquire() {
        const tryGet = (opts) =>
          getCurrentPositionOnce(opts).then(
            (pos) => ({ ok: true, pos }),
            (err) => ({ ok: false, err })
          );

        try {
          setBusy(true);

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
            map.setCenter({ lat: firstLat, lng: firstLng });
            map.setZoom(first ? 12 : 5);
            showToast(
              "現在地取得に失敗しました。ブラウザの権限を確認してください。"
            );
            return;
          }

          const { latitude, longitude } = got.coords;
          showMe(latitude, longitude);
        } finally {
          setBusy(false);
        }
      }

      btnDiv.onclick = () => acquire();
      btnDiv.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          acquire();
        }
      };

      // 初回も一応トライ（権限ブロックされてもOK）
      acquire();

      /* ===== クラスタを作る / 作り直す ===== */
      function rebuildCluster() {
        const allMarkers = [];
        markerById.forEach(({ marker }) => {
          if (marker) allMarkers.push(marker);
        });

        // 既存クラスタの掃除
        if (clusterer && typeof clusterer.clearMarkers === "function") {
          clusterer.clearMarkers();
        } else if (clusterer && Array.isArray(clusterer.markers)) {
          clusterer.markers.forEach((m) => m.setMap(null));
        }

        // 方法Bで main.jsx に書いたものをここで拾う
        const MC =
          window?.markerClusterer?.MarkerClusterer ||
          window?.MarkerClusterer ||
          null;

        if (!MC) {
          // ライブラリがなかったら素で置く
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[MapView] MarkerClusterer が見つからないので素の Marker で表示します。main.jsx に `window.MarkerClusterer = MarkerClusterer` を書いたか確認してください。"
            );
          }
          allMarkers.forEach((m) => m.setMap(map));
          clusterer = null;
          return;
        }

        // 新しいクラスタを貼る
        clusterer = new MC({
          map,
          markers: allMarkers,
        });
      }

      // 初期分を反映
      rebuildCluster();

      /* ===== idle で /places/map を叩く ===== */
      let idleTimer = null;
      const handleIdle = () => {
        if (!map) return;
        if (idleTimer) clearTimeout(idleTimer);

        idleTimer = setTimeout(async () => {
          const bounds = map.getBounds();
          if (!bounds) return;
          const zoom = map.getZoom();

          try {
            // MyPlacesMap と同じ：bounds をそのまま渡す
            const res = await fetchPlacesForMap({ bounds, zoom, limit: 300 });
            const places = Array.isArray(res) ? res : res?.data || [];

            let added = false;
            for (const p of places) {
              const lat = p.latitude ?? p.lat;
              const lng = p.longitude ?? p.lng;
              if (
                lat == null ||
                lng == null ||
                Number.isNaN(Number(lat)) ||
                Number.isNaN(Number(lng))
              ) {
                continue;
              }
              const id = p.id ?? p.place_id;
              if (id != null && markerById.has(id)) continue;

              const m = createPlainMarker({
                ...p,
                latitude: lat,
                longitude: lng,
              });
              if (!m) continue;

              if (id != null) {
                markerById.set(id, { data: p, marker: m });
              } else {
                markerById.set(Symbol(), { data: p, marker: m });
              }
              added = true;
            }

            if (added) {
              rebuildCluster();
            }
          } catch (err) {
            console.warn("fetchPlacesForMap failed:", err);
          }
        }, 300);
      };

      map.addListener("idle", handleIdle);
      // 初回も1回呼ぶ
      handleIdle();
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  return (
    <div
      ref={ref}
      className="w-full rounded-xl border"
      style={{ height: "420px", position: "relative" }}
    />
  );
}

/* ===== util ===== */

function buildMapsUrl(p) {
  const name = p.name || "";
  const addr =
    p.full_address ||
    p.address_line ||
    [p.city, p.state, p.postal_code, p.country].filter(Boolean).join(" ") ||
    "";

  const q = [name, addr].filter(Boolean).join(" ").trim();
  if (q) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      q
    )}`;
  }

  const lat = p.latitude ?? p.lat;
  const lng = p.longitude ?? p.lng;
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lat},${lng}`
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

    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
      <a href="/places/${p.id}" style="text-decoration:none;background:#111827;color:#fff;padding:8px 10px;border-radius:10px;font-size:12px;">詳細</a>
      <a href="${mapsUrl}" target="_blank" rel="noopener" style="text-decoration:none;background:#e5e7eb;color:#111827;padding:8px 10px;border-radius:10px;font-size:12px;">Googleマップ</a>
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
