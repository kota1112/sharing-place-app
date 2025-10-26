// import { useEffect, useMemo, useRef, useState } from "react";
// import { api } from "../lib/api";
// import { ensureGoogleMapsLoaded } from "../lib/gmapsLoader";

// const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY;

// // 0,0 など無効に近い座標を弾くためのヘルパ
// const isValidLatLng = (lat, lng) =>
//   Number.isFinite(lat) &&
//   Number.isFinite(lng) &&
//   Math.abs(lat) > 0.0001 &&
//   Math.abs(lng) > 0.0001;

// export default function MapAllPlaces() {
//   const mapDivRef = useRef(null);
//   const mapRef = useRef(null);
//   const infoRef = useRef(null);
//   const markersRef = useRef([]);

//   const [items, setItems] = useState([]);
//   const [q, setQ] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");

//   // 住所→座標の簡易キャッシュ（メモリ）
//   const geocodeCacheRef = useRef(new Map());

//   // Places 読み込み
//   useEffect(() => {
//     const ac = new AbortController();
//     setLoading(true);
//     setErr("");

//     api("/places", { signal: ac.signal })
//       .then((data) => setItems(Array.isArray(data) ? data : []))
//       .catch((e) => {
//         if (e.name !== "AbortError") setErr(String(e?.message || e));
//       })
//       .finally(() => setLoading(false));

//     return () => ac.abort();
//   }, []);

//   // Google Maps 読み込み & 初期化
//   useEffect(() => {
//     let cancelled = false;

//     (async () => {
//       try {
//         if (!GMAPS_KEY) throw new Error("VITE_GOOGLE_MAPS_API_KEY が未設定です");
//         await ensureGoogleMapsLoaded(GMAPS_KEY);
//         if (cancelled || !mapDivRef.current) return;

//         mapRef.current = new google.maps.Map(mapDivRef.current, {
//           center: { lat: 35.681236, lng: 139.767125 }, // 東京駅近辺
//           zoom: 11,
//           mapTypeControl: false,
//           streetViewControl: false,
//           fullscreenControl: true,
//         });
//         infoRef.current = new google.maps.InfoWindow();
//       } catch (e) {
//         if (!cancelled) setErr(e.message || String(e));
//       }
//     })();

//     return () => { cancelled = true; };
//   }, []);

//   // 検索フィルタ
//   const filtered = useMemo(() => {
//     const needle = q.trim().toLowerCase();
//     if (!needle) return items;
//     return items.filter((p) => {
//       const text = `${p.name ?? ""} ${p.city ?? ""} ${p.description ?? ""}`.toLowerCase();
//       return text.includes(needle);
//     });
//   }, [items, q]);

//   // —— ここが“暫定ジオコーディング”の要点 ——
//   // 1) まず座標が既にある Place はそのまま使用
//   // 2) 無い Place は address / city / country から Geocoder で座標を取得（最大20件）
//   async function buildPointsForMarkers(list) {
//     if (!window.google?.maps) return [];

//     const geocoder = new google.maps.Geocoder();
//     const cache = geocodeCacheRef.current;
//     const points = [];

//     let geocodedCount = 0;
//     for (const p of list) {
//       const lat = Number(p.latitude);
//       const lng = Number(p.longitude);

//       if (isValidLatLng(lat, lng)) {
//         points.push({ place: p, position: { lat, lng } });
//         continue;
//       }

//       // 住所が作れないならスキップ
//       const addr = [p.address_line, p.city, p.state, p.postal_code, p.country]
//         .filter(Boolean)
//         .join(" ");
//       if (!addr) continue;

//       // キャッシュ命中
//       if (cache.has(addr)) {
//         const pos = cache.get(addr);
//         if (pos && isValidLatLng(pos.lat, pos.lng)) {
//           points.push({ place: p, position: pos });
//         }
//         continue;
//       }

//       // API呼びすぎを防ぐ：1回の描画で最大20件まで
//       if (geocodedCount >= 20) continue;
//       geocodedCount += 1;

//       try {
//         const result = await geocoder.geocode({ address: addr }).then((r) => r.results?.[0]);
//         const loc = result?.geometry?.location;
//         const pos = loc ? { lat: loc.lat(), lng: loc.lng() } : null;
//         cache.set(addr, pos);
//         if (pos && isValidLatLng(pos.lat, pos.lng)) {
//           points.push({ place: p, position: pos });
//         }
//       } catch (_) {
//         // 無視（見つからないなど）
//         cache.set(addr, null);
//       }
//     }

//     return points;
//   }

//   // マーカー更新
//   useEffect(() => {
//     let cancelled = false;
//     const map = mapRef.current;
//     if (!map) return;

//     (async () => {
//       // 既存マーカーを消す
//       markersRef.current.forEach((m) => m.setMap(null));
//       markersRef.current = [];

//       const points = await buildPointsForMarkers(filtered);
//       if (cancelled) return;

//       const bounds = new google.maps.LatLngBounds();
//       let hasAny = false;

//       points.forEach(({ place: p, position }) => {
//         const marker = new google.maps.Marker({
//           position,
//           map,
//           title: p.name,
//         });

//         marker.addListener("click", () => {
//           const thumbnail =
//             p.first_photo_url ??
//             (Array.isArray(p.photo_urls) && p.photo_urls[0]) ??
//             null;

//           const html = `
//             <div style="max-width:260px">
//               ${thumbnail ? `<img src="${thumbnail}" alt="${p.name}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:8px" />` : ""}
//               <div style="font-weight:600;margin-bottom:4px">${escapeHtml(p.name ?? "")}</div>
//               <div style="font-size:12px;color:#666;margin-bottom:8px">${escapeHtml(p.city ?? "-")}</div>
//               <a href="/places/${p.id}" style="font-size:12px;color:#2563eb;text-decoration:underline">詳細を見る</a>
//             </div>
//           `;
//           infoRef.current.setContent(html);
//           infoRef.current.open(map, marker);
//         });

//         markersRef.current.push(marker);
//         bounds.extend(marker.getPosition());
//         hasAny = true;
//       });

//       if (hasAny) {
//         map.fitBounds(bounds);
//         const listener = google.maps.event.addListenerOnce(map, "bounds_changed", () => {
//           if (map.getZoom() > 15) map.setZoom(15);
//           google.maps.event.removeListener(listener);
//         });
//       } else {
//         // 何も置けない場合のフォールバック
//         map.setCenter({ lat: 35.681236, lng: 139.767125 });
//         map.setZoom(11);
//       }
//     })();

//     return () => { cancelled = true; };
//     // filtered が変わるたびに実行
//   }, [filtered]);

//   return (
//     <div className="mx-auto max-w-6xl px-4 py-6">
//       {/* 検索バー */}
//       <div className="mb-3 flex gap-2">
//         <input
//           className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
//           placeholder="例: 渋谷 / 大阪 / cafe など"
//           value={q}
//           onChange={(e) => setQ(e.target.value)}
//         />
//         <button
//           className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 active:scale-[.99]"
//           onClick={() => setQ(q)}
//         >
//           Search
//         </button>
//       </div>

//       {!!err && (
//         <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//           {err}
//         </div>
//       )}
//       {loading && <div className="mb-3 text-sm text-gray-500">Loading places...</div>}

//       <div
//         ref={mapDivRef}
//         style={{ width: "100%", height: "72vh", borderRadius: 12, border: "1px solid #e5e7eb" }}
//       />
//     </div>
//   );
// }

// function escapeHtml(s) {
//   return String(s)
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;")
//     .replaceAll('"', "&quot;")
//     .replaceAll("'", "&#39;");
// }
