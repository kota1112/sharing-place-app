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
      if (cancelled || !g?.maps || !ref.current) return;

      // lat/lng を持つものだけ
      const withCoords = items.filter(
        p =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );
      if (withCoords.length === 0) return;

      const center = { lat: +withCoords[0].latitude, lng: +withCoords[0].longitude };
      const opts = {
        center,
        zoom: 12,
        ...(MAP_ID ? { mapId: MAP_ID } : {}),
        gestureHandling: greedyScroll ? "greedy" : "cooperative",
        zoomControl: true,
      };

      const [{ Map }, markerLib] = await Promise.all([
        g.maps.importLibrary("maps"),
        g.maps.importLibrary("marker"),
      ]);
      if (cancelled || !ref.current) return;

      const map = new Map(ref.current, opts);

      // AdvancedMarker を置く
      withCoords.forEach((p) => {
        const position = { lat: +p.latitude, lng: +p.longitude };
        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position,
          title: p.name || "",
        });

        // クリックで InfoWindow 風パネルを表示（簡易版）
        marker.addListener("click", () => {
          const content = document.createElement("div");
          content.className =
            "rounded-xl shadow-lg bg-white p-3 w-72 leading-tight text-[14px]";
          content.innerHTML = `
            <div class="font-semibold text-[16px] mb-1">${escapeHtml(p.name || "")}</div>
            <div class="text-gray-500 mb-2">${escapeHtml(p.full_address || p.address_line || p.city || "")}</div>
            <div class="text-gray-700 mb-3">${escapeHtml((p.description || "").slice(0, 60))}</div>
            <div class="flex gap-2">
              <a href="/places/${p.id}" class="px-3 py-2 rounded-lg bg-black text-white text-sm">詳細を見る</a>
              ${
                (p.latitude != null && p.longitude != null)
                  ? `<a target="_blank" rel="noopener" class="px-3 py-2 rounded-lg bg-gray-100 text-sm"
                       href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                         `${p.name || ""} ${p.full_address || ""}`.trim()
                       )}">Google マップで開く</a>`
                  : ""
              }
            </div>
          `;

          // 新 API の InfoWindow 相当（View ではないので簡易カスタム）
          const iw = new g.maps.InfoWindow({ content });
          iw.open({ anchor: marker, map });
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [items, greedyScroll]);

  return <div ref={ref} className="h-[520px] w-full rounded-xl border" />;
}

// ちょいユーティリティ
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}
