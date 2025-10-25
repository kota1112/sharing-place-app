/* global google */
import { useEffect, useRef } from "react";
import { ensureMaps } from "../../../lib/maps";

const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

export default function MapView({ items = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await ensureMaps();
      if (cancelled || !ref.current) return;

      const g = window.google;

      // 座標のあるレコードのみ
      const withCoords = items.filter(
        (p) =>
          p &&
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(+p.latitude) &&
          !Number.isNaN(+p.longitude)
      );
      if (withCoords.length === 0) return;

      const center = { lat: +withCoords[0].latitude, lng: +withCoords[0].longitude };
      const mapOpts = { center, zoom: 12, ...(MAP_ID ? { mapId: MAP_ID } : {}) };

      // 新ローダ + Advanced Marker
      const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
        g.maps.importLibrary("maps"),
        g.maps.importLibrary("marker"),
      ]);
      if (cancelled || !ref.current) return;

      const map = new Map(ref.current, mapOpts);

      // 共有 InfoWindow（毎回 new しない）
      const info = new g.maps.InfoWindow({ maxWidth: 260 });

      // --- コンパクトカードHTML（画像は 72x72 / 右にテキスト） ---
      const buildInfoHtml = (p) => {
        const photo = p.first_photo_url || "";
        const safe = (s = "") => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const name = safe(p.name);
        const address = safe(p.full_address || p.address_line || p.city || "");
        const desc = p.description ? safe(p.description) : "";

        // 2行分で切る（省略）
        const descHtml = desc
          ? `<div style="
                font-size:12px;margin-top:6px;margin-bottom:10px;
                max-height:2.8em;overflow:hidden;display:-webkit-box;
                -webkit-line-clamp:2;-webkit-box-orient:vertical;
              ">${desc}</div>`
          : "";

        // Google マップへ
        const mapsUrl = p.google_place_id
          ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
              p.google_place_id
            )}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${p.latitude},${p.longitude}`
            )}`;

        const img = photo
          ? `<img src="${photo}" alt="${name}" style="
                width:72px;height:72px;object-fit:cover;border-radius:10px;flex:0 0 72px;
              " />`
          : `<div style="
                width:72px;height:72px;border-radius:10px;background:#f3f4f6;
                color:#6b7280;font-size:10px;display:flex;align-items:center;justify-content:center;
                flex:0 0 72px;
              ">No<br/>image</div>`;

        return `
          <div style="width:240px;padding:12px;border-radius:14px;">
            <div style="display:flex;gap:10px;align-items:center;">
              ${img}
              <div style="min-width:0;">
                <div style="
                  font-weight:700;font-size:15px;line-height:1.2;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                ">${name}</div>
                <div style="
                  color:#6b7280;font-size:12px;margin-top:2px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                ">${address}</div>
              </div>
            </div>

            ${descHtml}

            <div style="display:flex;gap:8px;">
              <a href="/places/${p.id}" style="
                   text-decoration:none;background:#111827;color:#fff;
                   padding:8px 10px;border-radius:10px;font-size:12px;
                 ">詳細を見る</a>
              <a href="${mapsUrl}" target="_blank" rel="noopener" style="
                   text-decoration:none;background:#e5e7eb;color:#111827;
                   padding:8px 10px;border-radius:10px;font-size:12px;
                 ">Google マップで開く</a>
            </div>
          </div>
        `;
      };

      // マーカー配置 & クリックで InfoWindow 表示
      withCoords.forEach((p) => {
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: +p.latitude, lng: +p.longitude },
          title: p.name || "",
        });

        marker.addListener("click", () => {
          info.close();
          info.setContent(buildInfoHtml(p));
          info.open({ anchor: marker, map });
        });
      });
    })();

    return () => { cancelled = true; };
  }, [items]);

  return <div ref={ref} className="h-96 w-full rounded-xl border" />;
}
