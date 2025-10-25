// src/使う、参考/components/forMypage/MyPlacesMap.jsx
// /* global google */
import { useEffect, useRef } from "react";
import { ensureMaps } from "../../../lib/maps";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

export default function MyPlacesMap({ items = [], greedyScroll = false }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await ensureMaps();
      const g = window.google;
      if (!g?.maps || cancelled || !ref.current) return;

      // 初期センター
      const first = items.find(
        (p) =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );
      const center = first
        ? { lat: +first.latitude, lng: +first.longitude }
        : { lat: 35.681236, lng: 139.767125 };

      // map
      const useImport = typeof g.maps.importLibrary === "function";
      const { Map } = useImport
        ? await g.maps.importLibrary("maps")
        : { Map: g.maps.Map };
      const map = new Map(ref.current, {
        center,
        zoom: 12,
        ...(MAP_ID ? { mapId: MAP_ID } : {}),
        gestureHandling: greedyScroll ? "greedy" : "cooperative",
      });

      // ---- AdvancedMarker / Marker を用意 ----
      let AdvancedMarkerElement, PinElement;
      if (useImport) {
        const markerLib = await g.maps.importLibrary("marker");
        AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
        PinElement = markerLib.PinElement;
      }

      const iw = new g.maps.InfoWindow();

      // 画像 or プレースホルダーを返すユーティリティ
      function makeImageBox(url) {
        const box = document.createElement("div");
        // 固定サイズ（小さめに）
        box.style.width = "96px"; // 24 * 4
        box.style.height = "72px"; // 18 * 4
        box.style.borderRadius = "8px";
        box.style.overflow = "hidden";
        box.style.background = "#f3f4f6"; // gray-100
        box.style.display = "flex";
        box.style.alignItems = "center";
        box.style.justifyContent = "center";

        if (!url) {
          box.textContent = "No image";
          box.style.color = "#6b7280"; // gray-500
          box.style.fontSize = "12px";
          return box;
        }

        const img = new Image();
        img.src = url;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";

        // 画像取得失敗 → プレースホルダーへ差し替え
        img.onerror = () => {
          box.textContent = "No image";
          box.style.color = "#6b7280";
          box.style.fontSize = "12px";
          img.remove();
        };

        img.onload = () => {
          // たまに CORS で onload するまで一瞬白く見えるのを防ぐ
          box.appendChild(img);
        };

        // 先に append しておいてもOK（onerror が差し替える）
        box.appendChild(img);
        return box;
      }

      // InfoWindow の内容を組み立て
      function makeCard(p) {
        const root = document.createElement("div");
        root.style.width = "320px";
        root.style.maxWidth = "80vw";
        root.style.fontFamily =
          "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,Apple Color Emoji,Segoe UI Emoji";
        root.style.padding = "12px";

        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "auto 1fr";
        row.style.gap = "12px";
        root.appendChild(row);

        // 画像 or No image
        const imgBox = makeImageBox(p.first_photo_url);
        row.appendChild(imgBox);

        // テキスト
        const col = document.createElement("div");
        row.appendChild(col);

        const name = document.createElement("div");
        name.textContent = p.name || "(no title)";
        name.style.fontSize = "16px";
        name.style.fontWeight = "700";
        col.appendChild(name);

        const addr = document.createElement("div");
        addr.textContent =
          p.full_address ||
          [p.address_line, p.city, p.state, p.postal_code, p.country]
            .filter(Boolean)
            .join(" ") ||
          "";
        addr.style.fontSize = "12px";
        addr.style.color = "#6b7280";
        addr.style.marginTop = "2px";
        col.appendChild(addr);

        if (p.description) {
          const d = document.createElement("div");
          d.textContent = p.description.slice(0, 60);
          d.style.fontSize = "12px";
          d.style.color = "#111827";
          d.style.marginTop = "6px";
          col.appendChild(d);
        }

        // ボタン列
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.marginTop = "10px";
        root.appendChild(actions);

        const btnDetail = document.createElement("a");
        btnDetail.textContent = "詳細を見る";
        btnDetail.href = `/places/${p.id}`;
        btnDetail.style.padding = "8px 12px";
        btnDetail.style.borderRadius = "8px";
        btnDetail.style.background = "#111827";
        btnDetail.style.color = "#fff";
        btnDetail.style.fontSize = "12px";
        btnDetail.style.textDecoration = "none";
        actions.appendChild(btnDetail);

        const btnG = document.createElement("a");
        // Place ID があれば Place 画面へ、それ以外は座標へ
        const gUrl = p.google_place_id
          ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(
              p.google_place_id
            )}`
          : `https://www.google.com/maps?q=${p.latitude},${p.longitude}`;
        btnG.href = gUrl;
        btnG.target = "_blank";
        btnG.rel = "noopener";
        btnG.textContent = "Google マップで開く";
        btnG.style.padding = "8px 12px";
        btnG.style.borderRadius = "8px";
        btnG.style.background = "#e5e7eb"; // gray-200
        btnG.style.color = "#111827";
        btnG.style.fontSize = "12px";
        btnG.style.textDecoration = "none";
        actions.appendChild(btnG);

        return root;
      }

      // マーカー配置
      const bounds = new g.maps.LatLngBounds();
      items.forEach((p) => {
        if (
          !p ||
          p.latitude == null ||
          p.longitude == null ||
          Number.isNaN(+p.latitude) ||
          Number.isNaN(+p.longitude)
        )
          return;

        const position = { lat: +p.latitude, lng: +p.longitude };
        bounds.extend(position);

        if (AdvancedMarkerElement) {
          const pin = new PinElement({
            glyph: (p.name || "").slice(0, 2).toUpperCase(),
          });
          const marker = new AdvancedMarkerElement({
            map,
            position,
            title: p.name || "",
            content: pin.element,
          });
          marker.addListener("gmp-click", () => {
            iw.close();
            iw.setContent(makeCard(p));
            iw.setPosition(position);
            iw.open({ map, anchor: marker });
          });
        } else {
          const marker = new g.maps.Marker({
            map,
            position,
            title: p.name || "",
          });
          marker.addListener("click", () => {
            iw.close();
            iw.setContent(makeCard(p));
            iw.open(map, marker);
          });
        }
      });

      if (!bounds.isEmpty()) map.fitBounds(bounds);
    })();

    return () => {
      cancelled = true;
    };
  }, [items, greedyScroll]);

  return <div ref={ref} className="h-[380px] w-full rounded-xl border" />;
}
