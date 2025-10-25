// src/使う、参考/components/forMypage/MyPlacesMap.jsx
// /* global google */
import { useEffect, useRef } from "react";
import { ensureMaps } from "../../../lib/maps";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

// geolocation 1回だけ取得（Promise 化）
function getCurrentPositionOnce(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEO_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

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
      advanced = false;

    (async () => {
      await ensureMaps();
      if (cancelled || !ref.current) return;

      const g = window.google;
      const canImport = typeof g.maps.importLibrary === "function";

      // ラスタ/ベクター両対応の Map 準備
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

      // アイテムをプロット
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
            new g.maps.Marker({
              map,
              position,
              title: p.name || "",
            });
            bounds.extend(position);
          }
        }
        // 収まるように
        map.fitBounds(bounds);
      } else {
        map.setCenter({ lat: 35.681236, lng: 139.767125 }); // 東京駅あたり
        map.setZoom(5);
      }

      // 現在地表示関数
      const showMe = (lat, lng) => {
        if (cancelled) return;
        const pos = { lat, lng };
        if (meMarker) {
          // 既にある場合は移動
          if (advanced) {
            meMarker.position = pos;
          } else {
            meMarker.setPosition(pos);
          }
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

      // 画面内に全マーカーを戻すフォールバック
      const fallbackFit = () => {
        if (valid.length > 0) {
          map.fitBounds(bounds);
        } else {
          map.setCenter({ lat: 35.681236, lng: 139.767125 });
          map.setZoom(5);
        }
      };

      // トースト
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
      const showToast = (msg, ms = 2500) => {
        toast.textContent = msg;
        toast.style.display = "block";
        setTimeout(() => (toast.style.display = "none"), ms);
      };

      // 位置取得（クリック/自動で挙動を少し変える）
      async function acquire(fromButton = false) {
        const setBusy = (busy) => {
          if (!btnDiv) return;
          if (busy) {
            btnDiv.textContent = "取得中…";
            btnDiv.style.opacity = "0.7";
            btnDiv.style.pointerEvents = "none";
          } else {
            btnDiv.textContent = "現在地を使う";
            btnDiv.style.opacity = "1";
            btnDiv.style.pointerEvents = "auto";
          }
        };

        const tryGet = (opts) =>
          getCurrentPositionOnce(opts).then(
            (pos) => ({ ok: true, pos }),
            (err) => ({ ok: false, err })
          );

        try {
          setBusy(true);

          const tries = fromButton
            ? [
                {
                  enableHighAccuracy: false,
                  timeout: 8000,
                  maximumAge: 300000,
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
              ]
            : [
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
                {
                  enableHighAccuracy: false,
                  timeout: 8000,
                  maximumAge: 300000,
                },
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

          const last = loadLastPos();
          if (last) {
            showMe(last.lat, last.lng);
            showToast("現在地取得に失敗。前回の位置を表示しました");
          } else {
            fallbackFit();
            showToast("現在地取得に失敗しました（権限/通信/環境を確認）");
          }
        } catch (e) {
          console.warn("[geo] acquisition failed:", e);
          showToast("現在地取得に失敗しました");
          const last = loadLastPos();
          if (last) showMe(last.lat, last.lng);
          else fallbackFit();
        } finally {
          setBusy(false);
        }
      }

      // 現在地ボタン（クリック確実化）
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
        pointerEvents: "auto", // ← 重要：クリック無効化を防ぐ
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
      // map/コントロール等は Google Maps が GC するが、
      // ここで DOM だけ片付けておく
      if (ref.current) {
        const t = ref.current.querySelector(
          ":scope > div[style*='position: absolute']"
        );
        if (t && t.parentNode === ref.current) {
          // toast が残っていたら消す
          try {
            ref.current.removeChild(t);
          } catch {}
        }
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
