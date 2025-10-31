// src/components/forMypage/MyPlacesMap.jsx
// My Page 用のマップ版（一覧を地図で見るやつ）
//
// やっていること（最新版）
//
// 1. 初期表示
//    - props.items のうち座標がある最初のものを中心に zoom=12
//    - それがなければ東京駅中心 zoom=5
// 2. Google Maps JS API は ensureMaps() でロード
// 3. マーカーは AdvancedMarkerElement / PinElement があればそれを使う
//    - ただし「クラスタリング」を使うときは通常 Marker に寄せるほうが自然なので、
//      クラスタ対象は「通常 Marker」で描画するようにしている
// 4. 右上に「現在地を使う」ボタン＋取得中インジケータ
// 5. 取得失敗時はマップ右下に赤いトースト
// 6. InfoWindow に「詳細 / Googleマップ / 編集 / 削除」ボタン
// 7. マップの idle（パン・ズームが止まったとき）に /places/map を叩いて、
//    その範囲のポイントを追加でマップに載せる
// 8. マーカーのクラスタリングを追加
//    - 取り直すたびに古いマーカーとクラスタをクリアして作り直す
//    - window.markerClusterer / window.MarkerClusterer があればそれを使う
//      （@googlemaps/markerclusterer をバンドルしている想定）
//    - なければ単に全部の Marker を map に載せるだけのフォールバック
//
// 重要:
// - props.items（=自分の登録分）は「必ず」載せる
// - /places/map から取ってきた分は「まだ載っていない id のものだけ」載せる
// - 両方合わせた結果をクラスタリングする
// - V5 で決めた「GoogleマップのURLの作り方（name+full_address→lat,lng→トップ）」も踏襲

import { useEffect, useRef } from "react";
import { ensureMaps } from "../../lib/maps";
import { fetchPlacesForMap } from "../../lib/api";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

// geolocation を1回だけ試す（Promiseラップ）
function getCurrentPositionOnce(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEO_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

export default function MyPlacesMap({
  items = [],
  greedyScroll = false,
  onEdit, // (id:number) => void
  onDelete, // (id:number) => Promise<void> | void
}) {
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

    // id → { data, marker } で覚えておく
    const markerById = new Map();

    // クラスタ管理（再取得のたびに全部張り替え）
    let clusterer = null;

    (async () => {
      await ensureMaps();
      if (cancelled || !ref.current) return;

      const g = window.google;
      const canImport = typeof g.maps.importLibrary === "function";

      // 初期中心
      const first = items.find(
        (p) =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );
      const defaultCenter = first
        ? { lat: +first.latitude, lng: +first.longitude }
        : { lat: 35.681236, lng: 139.767125 };

      const mapOpts = {
        center: defaultCenter,
        zoom: first ? 12 : 5,
        ...(MAP_ID ? { mapId: MAP_ID } : {}),
        gestureHandling: greedyScroll ? "greedy" : "greedy",
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

      // ========== InfoWindow を開く共通関数 ==========
      const openInfo = (place, anchor) => {
        if (!info) return;
        info.setContent(buildInfoHtml(place));

        g.maps.event.addListenerOnce(info, "domready", () => {
          const root = document.getElementById(`infocontent-${place.id}`);
          if (!root) return;

          const editBtn = root.querySelector("[data-action='edit']");
          const delBtn = root.querySelector("[data-action='delete']");

          if (editBtn) {
            editBtn.addEventListener("click", (e) => {
              e.preventDefault();
              if (onEdit) {
                onEdit(place.id);
              } else {
                // map API から来たやつでも詳細に飛べるように
                window.location.href = `/places/${place.id}`;
              }
            });
          }

          if (delBtn) {
            delBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              const ok = window.confirm(
                `「${place.name || "この場所"}」を削除しますか？`
              );
              if (!ok) return;
              try {
                if (onDelete) {
                  await onDelete(place.id);
                } else {
                  throw new Error("削除ハンドラがありません");
                }
                info.close();
              } catch (err) {
                alert(`削除に失敗しました: ${err?.message || err}`);
              }
            });
          }
        });

        // AdvancedMarker と普通の Marker で分岐
        if (anchor && typeof anchor.addListener === "function") {
          info.open({ map, anchor });
        } else {
          info.open(map, anchor);
        }
      };

      // ========== マーカーを「通常 Marker」で作る関数 ==========
      // （クラスタリングするので基本はこれを使う）
      function createPlainMarker(place) {
        const pos = { lat: +place.latitude, lng: +place.longitude };
        const marker = new g.maps.Marker({
          position: pos,
          title: place.name || "",
          // ここでは map をセットしない（クラスタに食わせる想定）
        });
        marker.addListener("click", () => openInfo(place, marker));
        return marker;
      }

      // ========== 初期アイテムを markers に積む ==========
      const initialMarkers = [];
      const initialValid = items.filter(
        (p) =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );
      for (const p of initialValid) {
        // 重複防止
        if (markerById.has(p.id)) continue;
        const m = createPlainMarker(p);
        markerById.set(p.id, { data: p, marker: m });
        initialMarkers.push(m);
      }

      // ========== 現在地ボタン＆トースト ==========
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
      btnDiv.tabIndex = 0;
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
        if (!btnDiv || !spinnerDiv) return;
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
            if (first) {
              map.setCenter(defaultCenter);
              map.setZoom(12);
            }
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

      // 初回自動取得
      acquire();

      // ========== クラスタリングを作る/作り直す関数 ==========
      function rebuildCluster() {
        // まず全部の marker を配列に
        const allMarkers = [];
        markerById.forEach(({ marker }) => {
          if (marker) allMarkers.push(marker);
        });

        // 既存クラスタを外す
        if (clusterer && typeof clusterer.clearMarkers === "function") {
          clusterer.clearMarkers();
        } else if (clusterer && Array.isArray(clusterer.markers)) {
          // 古いAPIのフォールバック
          clusterer.markers.forEach((m) => m.setMap(null));
        }

        // window.markerClusterer / window.MarkerClusterer を試す
        const MC =
          window?.markerClusterer?.MarkerClusterer ||
          window?.MarkerClusterer ||
          null;

        if (!MC) {
          // クラスタライブラリがないなら素で map に載せる
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

      // 初期の props.items をクラスタに反映
      rebuildCluster();

      // ========== マップの idle でサーバに問い合わせ ==========
      let idleTimer = null;
      const handleIdle = () => {
        if (!map) return;
        if (idleTimer) clearTimeout(idleTimer);

        idleTimer = setTimeout(async () => {
          const bounds = map.getBounds();
          if (!bounds) return;
          const zoom = map.getZoom();

          try {
            const res = await fetchPlacesForMap({ bounds, zoom,limit: 300});
            const places = Array.isArray(res) ? res : res?.data || [];

            let added = false;
            for (const p of places) {
              if (
                p.latitude == null ||
                p.longitude == null ||
                Number.isNaN(+p.latitude) ||
                Number.isNaN(+p.longitude)
              ) {
                continue;
              }
              if (markerById.has(p.id)) continue;

              const m = createPlainMarker(p);
              markerById.set(p.id, { data: p, marker: m });
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
      handleIdle();
    })();

    return () => {
      cancelled = true;
    };
  }, [items, greedyScroll, onEdit, onDelete]);

  return (
    <div
      ref={ref}
      className="w-full rounded-xl border"
      style={{ height: "420px", position: "relative" }}
    />
  );
}

/* ================= Utilities ================= */

// V5 の統一ルール: name + full_address → lat,lng → maps トップ
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
  <div id="infocontent-${p.id}" style="width:260px;padding:12px 12px 10px;border-radius:14px;">
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
      <a href="#" data-action="edit"  style="text-decoration:none;background:#0ea5e9;color:#fff;padding:8px 10px;border-radius:10px;font-size:12px;">編集</a>
      <a href="#" data-action="delete" style="text-decoration:none;background:#fca5a5;color:#7f1d1d;padding:8px 10px;border-radius:10px;font-size:12px;">削除</a>
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
