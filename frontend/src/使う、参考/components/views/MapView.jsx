import { useEffect, useRef } from "react";
import { loadMaps } from "../../../lib/maps";

export default function MapView({ items = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    let map;
    (async () => {
      const maps = await loadMaps();
      if (!ref.current) return;
      const center = items.find(p => p.latitude!=null && p.longitude!=null)
        ? { lat: Number(items[0].latitude), lng: Number(items[0].longitude) }
        : { lat: 35.681236, lng: 139.767125 }; // 東京駅
      map = new maps.Map(ref.current, { center, zoom: 12 /* , mapId: import.meta.env.VITE_MAP_ID */ });

      // Marker（将来は AdvancedMarkerElement に差し替えOK）
      items
        .filter(p => p.latitude!=null && p.longitude!=null)
        .forEach(p => new maps.Marker({
          position: { lat: Number(p.latitude), lng: Number(p.longitude) },
          map, title: p.name
        }));
    })();
    return () => { /* SPA遷移時のクリーンアップがあればここに */ };
  }, [items]);

  return <div className="h-[520px] w-full rounded-xl border" ref={ref} />;
}
