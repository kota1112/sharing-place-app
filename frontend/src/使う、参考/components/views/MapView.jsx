// /* global google */
import { useEffect, useRef } from "react";
import { ensureMaps } from "../../../lib/maps";

// .env に設定していればベクターマップ + AdvancedMarker が有効になります
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

export default function MapView({ items = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureMaps();
        const g = window.google;
        if (!g?.maps || cancelled || !ref.current) return;

        const withCoords = items.filter(
          (p) =>
            p &&
            p.latitude != null &&
            p.longitude != null &&
            !Number.isNaN(+p.latitude) &&
            !Number.isNaN(+p.longitude)
        );
        if (withCoords.length === 0) return;

        const center = {
          lat: +withCoords[0].latitude,
          lng: +withCoords[0].longitude,
        };
        const mapOpts = { center, zoom: 12, ...(MAP_ID ? { mapId: MAP_ID } : {}) };

        const canImport = typeof g.maps.importLibrary === "function";
        const MapCtor = canImport ? (await g.maps.importLibrary("maps")).Map : g.maps.Map;
        const map = new MapCtor(ref.current, mapOpts);

        // 1つの InfoWindow を使い回す
        const info = new g.maps.InfoWindow();

        // Advanced Marker（ベクター版）準備
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
              glyph: (p.name || "").slice(0, 2).toUpperCase(),
            });
            marker = new AdvancedMarkerElement({
              map,
              position,
              content: pin.element,
              title: p.name || "",
            });

            // AdvancedMarker は 'gmp-click' イベント
            marker.addListener("gmp-click", () => {
              info.setContent(buildInfoHtml(p));
              info.open(map, marker);
            });
          } else {
            marker = new g.maps.Marker({ map, position, title: p.name || "" });
            marker.addListener("click", () => {
              info.setContent(buildInfoHtml(p));
              info.open(map, marker);
            });
          }
        });
      } catch (e) {
        console.error("[MapView] failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  return <div ref={ref} className="h-96 w-full rounded-xl border" />;
}

/* ========= Utilities ========= */

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
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  if (p.latitude != null && p.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${p.latitude},${p.longitude}`
    )}`;
  }
  return "https://www.google.com/maps";
}

/** 小さめサムネ（72x72）＋ 右にテキストのレイアウト */
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
