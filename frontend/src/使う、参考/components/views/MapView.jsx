/* global google */
import { useEffect, useRef } from "react";
import { ensureMaps } from "../../../lib/maps";

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

        const center = { lat: +withCoords[0].latitude, lng: +withCoords[0].longitude };
        const mapOpts = { center, zoom: 12, ...(MAP_ID ? { mapId: MAP_ID } : {}) };

        const canUseAdvanced = typeof g.maps.importLibrary === "function";

        if (canUseAdvanced) {
          const [{ Map }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
            g.maps.importLibrary("maps"),
            g.maps.importLibrary("marker"),
          ]);
          if (cancelled || !ref.current) return;

          const map = new Map(ref.current, mapOpts);
          // 動作確認用：MapIDが本当に入っているか
          console.log("mapId:", map.get("mapId"));

          withCoords.forEach((p) => {
            const position = { lat: +p.latitude, lng: +p.longitude };

            // ★ 非推奨の glyph ではなく glyphText を使う
            const pin = new PinElement({
              glyphText: (p.name || "").slice(0, 2).toUpperCase(),
              // お好みで:
              // background: "#ff6b6b",
              // borderColor: "#b23a48",
              // glyphColor: "#fff",
            });

            new AdvancedMarkerElement({
              map,
              position,
              content: pin.element,
              title: p.name || "",
            });
          });
          return;
        }

        // フォールバック（旧API）
        const map = new g.maps.Map(ref.current, mapOpts);
        withCoords.forEach((p) => {
          new g.maps.Marker({
            map,
            position: { lat: +p.latitude, lng: +p.longitude },
            title: p.name || "",
          });
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
