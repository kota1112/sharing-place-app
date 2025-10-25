// /* global google */
// src/使う、参考/components/forMypage/MyPlacesMap.jsx
// 初期表示は「先頭アイテムの位置 (zoom=12)」→ 直後に geolocation を自動試行（1回）
// 右上の独自コントロール「現在地を使う」でも同ロジック（失敗時は先頭へ）

import { useEffect, useRef } from "react";
import { ensureMaps } from "../../../lib/maps";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

// geolocation 1回
function getCurrentPositionOnce(opts) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEO_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

export default function MyPlacesMap({ items = [], greedyScroll = false }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let map, meMarker, btnDiv, advanced = false;
    let spinnerDiv, toastDiv;

    (async () => {
      await ensureMaps();
      if (cancelled || !ref.current) return;

      const g = window.google;
      const canImport = typeof g.maps.importLibrary === "function";

      // 先頭 or 東京駅
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

      // places マーカー
      const valid = items.filter(
        (p) =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );
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
        }
      } else {
        for (const p of valid) {
          const position = { lat: +p.latitude, lng: +p.longitude };
          new g.maps.Marker({ map, position, title: p.name || "" });
        }
      }

      // 右上：現在地ボタン
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

      // 右上：取得中インジケータ
      spinnerDiv = document.createElement("div");
      spinnerDiv.style.cssText =
        "display:none;background:rgba(255,255,255,0.95);padding:8px 10px;margin:10px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-size:12px;";
      spinnerDiv.innerHTML =
        `<span style="display:inline-block;width:14px;height:14px;border:3px solid #cbd5e1;border-top-color:#334155;border-radius:50%;margin-right:6px;vertical-align:-2px;animation:spin 1s linear infinite"></span>位置情報を取得中…`;
      map.controls[g.maps.ControlPosition.TOP_RIGHT].push(spinnerDiv);

      // 下右：トースト（失敗時）
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
              const { AdvancedMarkerElement } =
                await g.maps.importLibrary("marker");
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

      // 取得共通ロジック（ボタン/自動）
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
            // 失敗 → 先頭の位置（zoom=12）に据え置き
            if (first) {
              map.setCenter(defaultCenter);
              map.setZoom(12);
            }
            showToast("現在地取得に失敗しました。先頭の場所を表示します。");
            return;
          }

          const { latitude, longitude } = got.coords;
          showMe(latitude, longitude);
        } finally {
          setBusy(false);
        }
      }

      // ボタン動作
      btnDiv.onclick = () => acquire();
      btnDiv.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          acquire();
        }
      };

      // ★ 初回だけ自動で geolocation を試す
      acquire();
    })();

    return () => {
      cancelled = true;
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
