// src/使う、参考/components/forMypage/MyPlacesMap.jsx
// /* global google */
import { useEffect, useRef } from "react";
import { ensureMaps } from "../../../lib/maps";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

// --- geolocation 1回だけ取得（Promise 化） ---
function getCurrentPositionOnce(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEO_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

// --- 前回位置のキャッシュ ---
const LAST_POS_KEY = "mypage:lastpos";
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

export default function MyPlacesMap({ items = [], greedyScroll = false }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let map,
      meMarker,
      btnDiv,
      toast,
      indicator,
      advanced = false;

    (async () => {
      await ensureMaps();
      if (cancelled || !ref.current) return;

      const g = window.google;
      const canImport = typeof g.maps.importLibrary === "function";

      // ---- Map 準備（ベクター/ラスタ両対応）----
      const mapOpts = {
        zoom: 5,
        ...(MAP_ID ? { mapId: MAP_ID } : {}),
        gestureHandling: greedyScroll ? "greedy" : "auto",
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

      // ---- アイテムをプロット ----
      const bounds = new g.maps.LatLngBounds();
      const valid = items.filter(
        (p) =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );

      if (valid.length > 0) {
        if (advanced) {
          const { AdvancedMarkerElement, PinElement } =
            await g.maps.importLibrary("marker");
        for (const p of valid) {
            const position = { lat: +p.latitude, lng: +p.longitude };
            const pin = new PinElement({
              glyphText: (p.name || "").slice(0, 2).toUpperCase(),
            });
            new AdvancedMarkerElement({
              map,
              position,
              content: pin.element,
              title: p.name || "",
            });
            bounds.extend(position);
          }
        } else {
          for (const p of valid) {
            const position = { lat: +p.latitude, lng: +p.longitude };
            new g.maps.Marker({ map, position, title: p.name || "" });
            bounds.extend(position);
          }
        }
        map.fitBounds(bounds);
      } else {
        map.setCenter({ lat: 35.681236, lng: 139.767125 }); // 東京駅
        map.setZoom(5);
      }

      // ---- 先頭アイテムの座標（フォールバック用）----
      const firstPos =
        valid.length > 0
          ? { lat: +valid[0].latitude, lng: +valid[0].longitude }
          : null;

      // ---- 現在地表示関数 ----
      const showMe = (lat, lng) => {
        if (cancelled) return;
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
        saveLastPos(lat, lng);
      };

      // ---- 取得中インジケーター ----
      indicator = document.createElement("div");
      Object.assign(indicator.style, {
        position: "absolute",
        right: "10px",
        top: "10px",
        background: "rgba(255,255,255,0.95)",
        padding: "8px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        display: "none",
        zIndex: "9999",
      });
      indicator.innerHTML =
        '<span class="spin" style="display:inline-block;width:14px;height:14px;border:2px solid #999;border-top-color:transparent;border-radius:50%;margin-right:6px;vertical-align:-2px;animation:mapspin 0.8s linear infinite"></span> 位置情報を取得中…';
      // 簡易 keyframes
      const style = document.createElement("style");
      style.textContent =
        "@keyframes mapspin{to{transform:rotate(360deg)}}";
      document.head.appendChild(style);
      ref.current.appendChild(indicator);

      const setBusy = (busy) => {
        if (btnDiv) {
          btnDiv.style.opacity = busy ? "0.7" : "1";
          btnDiv.style.pointerEvents = busy ? "none" : "auto";
          btnDiv.textContent = busy ? "取得中…" : "現在地を使う";
        }
        indicator.style.display = busy ? "block" : "none";
      };

      // ---- トースト ----
      toast = document.createElement("div");
      Object.assign(toast.style, {
        position: "absolute",
        right: "10px",
        top: "56px",
        background: "rgba(17,17,17,0.9)",
        color: "#fff",
        padding: "8px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        zIndex: "9999",
        display: "none",
      });
      ref.current.appendChild(toast);
      const showToast = (msg, ms = 2400) => {
        toast.textContent = msg;
        toast.style.display = "block";
        setTimeout(() => (toast.style.display = "none"), ms);
      };

      // ---- 位置取得（MyPage 版・段階的トライ & 前回位置）----
      async function acquire(fromButton = false) {
        const tryGet = (opts) =>
          getCurrentPositionOnce(opts).then(
            (pos) => ({ ok: true, pos }),
            (err) => ({ ok: false, err })
          );

        try {
          setBusy(true);

          // クリック時は「低精度→高精度」、自動時は「高精度→低精度」
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
          for (const o of tries) {
            const r = await tryGet(o);
            if (r.ok) {
              got = r.pos;
              break;
            }
          }

          if (got) {
            const { latitude, longitude } = got.coords;
            showMe(latitude, longitude);
            showToast("現在地を表示しました");
            return;
          }

          // 失敗時：前回位置 or 先頭アイテム（zoom 12）
          const last = loadLastPos();
          if (last) {
            showMe(last.lat, last.lng);
            showToast("取得失敗。前回の位置を表示しました");
          } else if (firstPos) {
            map.setCenter(firstPos);
            map.setZoom(12);
            showToast("取得失敗。先頭の場所を表示しました");
          } else {
            showToast("現在地取得に失敗しました");
          }
        } finally {
          setBusy(false);
        }
      }

      // ---- 現在地ボタン（TOP_RIGHT）----
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

      btnDiv.onclick = () => acquire(true);
      btnDiv.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          acquire(true);
        }
      };

      // 初回は自動取得
      acquire(false);
    })();

    return () => {
      cancelled = true;
      // DOM 片付け（toast / indicator）
      if (ref.current) {
        Array.from(ref.current.querySelectorAll(":scope > div")).forEach((d) => {
          try {
            if (d.style?.position === "absolute") ref.current.removeChild(d);
          } catch {}
        });
      }
    };
  }, [items, greedyScroll]);

  return (
    <div
      ref={ref}
      className="w-full rounded-xl border"
      style={{ height: "420px", position: "relative" }}
    />
  );
}
