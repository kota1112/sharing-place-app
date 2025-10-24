// import { useEffect, useState, useMemo } from "react";
// import { useParams, Link } from "react-router-dom";
// import { api } from "../lib/api";

// export default function C() {
//   const { id } = useParams();
//   const [place, setPlace] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");

//   useEffect(() => {
//     const ac = new AbortController();
//     setLoading(true);
//     setErr("");
//     api(`/places/${id}`, { signal: ac.signal })
//       .then((data) => setPlace(data))
//       .catch((e) => {
//         if (e.name !== "AbortError") setErr(e?.message || String(e));
//       })
//       .finally(() => setLoading(false));
//     return () => ac.abort();
//   }, [id]);

//   const address = useMemo(() => {
//     if (!place) return "";
//     const { address_line, city, state, postal_code, country } = place;
//     return [address_line, city, state, postal_code, country].filter(Boolean).join(" ");
//   }, [place]);

//   if (loading) return <Skeleton />;

//   if (err || !place) {
//     return (
//       <main className="mx-auto max-w-3xl px-4 py-10">
//         <BackLink />
//         <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
//           詳細を取得できませんでした。{err ? <code className="ml-2">{String(err)}</code> : null}
//         </div>
//       </main>
//     );
//   }

//   const photos = Array.isArray(place.photo_urls) ? place.photo_urls : [];
//   const mainPhoto = photos[0] ?? null;

//   return (
//     <main className="mx-auto max-w-3xl px-4 py-10">
//       <BackLink />

//       <h1 className="mt-2 text-3xl font-bold tracking-tight">{place.name}</h1>

//       {/* メイン写真 or プレースホルダ */}
//       <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
//         {mainPhoto ? (
//           <img
//             src={mainPhoto}
//             alt={place.name}
//             loading="lazy"
//             className="h-72 w-full object-cover"
//             onError={(e) => (e.currentTarget.style.display = "none")}
//           />
//         ) : (
//           <div className="grid h-72 w-full place-items-center bg-slate-50 text-slate-400">
//             no photo
//           </div>
//         )}
//       </div>

//       {/* 住所 */}
//       <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//         <h2 className="mb-2 text-lg font-semibold">Address</h2>
//         <p className="text-slate-800">{address || "—"}</p>
//       </section>

//       {/* サムネイル（2枚目以降があれば表示） */}
//       {photos.length > 1 && (
//         <section className="mt-6">
//           <h3 className="mb-2 text-sm font-medium text-slate-600">More photos</h3>
//           <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
//             {photos.slice(1).map((url, i) => (
//               <li key={i} className="overflow-hidden rounded-xl border border-slate-200">
//                 <img
//                   src={url}
//                   alt={`${place.name} photo ${i + 2}`}
//                   loading="lazy"
//                   className="h-36 w-full object-cover"
//                   onError={(e) => (e.currentTarget.style.display = "none")}
//                 />
//               </li>
//             ))}
//           </ul>
//         </section>
//       )}
//     </main>
//   );
// }

// /* ------- 小物 ------- */

// function BackLink() {
//   return (
//     <Link to="/abc" className="text-blue-600 underline-offset-2 hover:underline">
//       ← Back
//     </Link>
//   );
// }

// function Skeleton() {
//   return (
//     <main className="mx-auto max-w-3xl px-4 py-10">
//       <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
//       <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
//       <div className="mt-4 h-72 w-full animate-pulse rounded-2xl bg-slate-200" />
//       <div className="mt-6 h-32 w-full animate-pulse rounded-2xl bg-slate-200" />
//     </main>
//   );
// }
