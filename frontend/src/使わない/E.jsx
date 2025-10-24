// // src/pages/MapSearchPage.jsx
// import { useEffect, useRef, useState } from "react";
// import { loadGoogleMaps } from "../lib/loadGoogleMaps";

// const GMAPS_KEY = import.meta.env.VITE_GMAPS_KEY;

// export default function MapSearchPage() {
//   const [q, setQ] = useState("");
//   const [ready, setReady] = useState(false); // Maps JS が使えるか
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");

//   const mapDivRef = useRef(null);
//   const mapRef = useRef(null);
//   const markerRef = useRef(null);
//   const geocoderRef = useRef(null);

//   // 1) スクリプト読み込み
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         if (!GMAPS_KEY) throw new Error("VITE_GOOGLE_MAPS_API_KEY が未設定です");
//         await loadGoogleMaps(GMAPS_KEY);
//         if (!cancelled) setReady(true);
//       } catch (e) {
//         if (!cancelled) setErr(e.message || String(e));
//       }
//     })();
//     return () => { cancelled = true; };
//   }, []);

//   // 2) DOM に <div> があり、かつ Maps が ready になったら初期化
//   useEffect(() => {
//     if (!ready) return;
//     if (!mapDivRef.current) return; // ← ここで null を回避
//     if (mapRef.current) return;     // 二重初期化防止

//     try {
//       mapRef.current = new google.maps.Map(mapDivRef.current, {
//         center: { lat: 35.681236, lng: 139.767125 }, // 東京駅
//         zoom: 12,
//         mapTypeControl: false,
//         streetViewControl: false,
//         fullscreenControl: true,
//       });
//       geocoderRef.current = new google.maps.Geocoder();
//     } catch (e) {
//       setErr(e.message || String(e));
//     } finally {
//       setLoading(false);
//     }
//   }, [ready]);

//   async function handleSearch(e) {
//     e?.preventDefault?.();
//     const text = q.trim();
//     if (!text || !mapRef.current || !geocoderRef.current) return;

//     try {
//       setErr("");
//       const { results } = await geocoderRef.current.geocode({ address: text });
//       if (!results?.length) {
//         setErr("該当する場所が見つかりませんでした");
//         return;
//       }
//       const loc = results[0].geometry.location;
//       mapRef.current.panTo(loc);
//       mapRef.current.setZoom(15);

//       if (!markerRef.current) {
//         markerRef.current = new google.maps.Marker({ map: mapRef.current });
//       }
//       markerRef.current.setPosition(loc);
//       markerRef.current.setTitle(results[0].formatted_address);
//     } catch (e) {
//       setErr("検索に失敗しました: " + (e.message || String(e)));
//     }
//   }

//   return (
//     <main className="mx-auto max-w-6xl px-4 py-6">
//       {/* 検索バー */}
//       <form onSubmit={handleSearch} className="mb-4 flex gap-2">
//         <input
//           className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
//           placeholder="住所・ランドマーク（例: 東京駅 / Osaka Castle）"
//           value={q}
//           onChange={(e) => setQ(e.target.value)}
//         />
//         <button
//           type="submit"
//           className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
//         >
//           Search
//         </button>
//       </form>

//       {!!err && (
//         <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//           {err}
//         </div>
//       )}

//       {/* 地図コンテナは常に描画しておく（高さ必須） */}
//       <div className="relative">
//         <div
//           ref={mapDivRef}
//           className="h-[70vh] w-full rounded-lg border border-gray-200"
//         />
//         {loading && (
//           <div className="pointer-events-none absolute inset-0 animate-pulse rounded-lg bg-gray-100" />
//         )}
//       </div>
//     </main>
//   );
// }
