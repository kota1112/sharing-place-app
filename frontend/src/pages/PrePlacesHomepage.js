// // src/pages/PlacesHomepage.jsx
// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";

// import {
//   api,
//   fetchPlaces, // /places?page=&per=&q=... （新）をまず試す
//   getToken,     // 右上の My Page / Log in 切り替え用
// } from "../lib/api";

// import SearchBar from "../components/SearchBar";
// import PlacesMain from "../components/PlacesMain";
// import AppHeader from "../components/layout/AppHeader";
// import AppFooter from "../components/layout/AppFooter";

// // --- 簡易デバウンス ---
// function useDebounce(value, ms) {
//   const [v, setV] = useState(value);
//   useEffect(() => {
//     const t = setTimeout(() => setV(value), ms);
//     return () => clearTimeout(t);
//   }, [value, ms]);
//   return v;
// }

// export default function PlacesHomepage() {
//   // 表示するデータ
//   const [items, setItems] = useState([]);

//   // ページネーション
//   const [page, setPage] = useState(1);
//   const per = 50;
//   const [total, setTotal] = useState(null);
//   const [totalPages, setTotalPages] = useState(1);

//   // 検索
//   const [q, setQ] = useState("");
//   const debouncedQ = useDebounce(q, 300);

//   // 表示モード
//   const [mode, setMode] = useState("grid");

//   // 状態
//   const [loading, setLoading] = useState(true);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [err, setErr] = useState("");

//   // 認証してるかどうか
//   const isAuthed = !!(getToken() || localStorage.getItem("token"));

//   // ===== 初回 + 検索が変わったとき → 1ページ目を読み込む =====
//   useEffect(() => {
//     let aborted = false;

//     async function loadFirst(query) {
//       setLoading(true);
//       setErr("");

//       try {
//         // 1. まず「新API」を試す
//         let res;
//         let usedNewApi = true;
//         try {
//           res = await fetchPlaces({ page: 1, per, q: query?.trim?.() || "" });
//         } catch (_e) {
//           // 2. 失敗したら旧APIにフォールバックして「1ページだけ」読む
//           usedNewApi = false;
//           const params = new URLSearchParams();
//           const trimmed = String(query || "").trim();
//           if (trimmed) params.set("q", trimmed);
//           const path = params.toString()
//             ? `/places?${params.toString()}`
//             : "/places";
//           res = await api(path);
//         }

//         if (aborted) return;

//         // 3. 返ってきた形をA案で吸収
//         let nextItems = [];
//         let nextTotal = null;
//         let nextTotalPages = 1;

//         if (Array.isArray(res)) {
//           // 旧APIの純配列
//           nextItems = res;
//           // 旧APIだと「もっと見る」はできないので totalPages=1 のまま
//           usedNewApi = false;
//         } else if (res && Array.isArray(res.data)) {
//           // 新API { data: [...], meta: {...} }
//           nextItems = res.data;
//           const meta = res.meta || {};
//           nextTotal = typeof meta.total === "number" ? meta.total : nextItems.length;
//           nextTotalPages = meta.total_pages || 1;
//         } else if (res && Array.isArray(res.items)) {
//           // あなたの元の想定 { items: [...], total: ... }
//           nextItems = res.items;
//           nextTotal =
//             typeof res.total === "number" ? res.total : nextItems.length;
//           // この形だとページ数が分からないので1ページ扱い
//           usedNewApi = false;
//         } else if (res && Array.isArray(res.places)) {
//           // 念のため
//           nextItems = res.places;
//           usedNewApi = false;
//         }

//         setItems(nextItems);
//         setPage(1);
//         setTotal(nextTotal);
//         setTotalPages(usedNewApi ? nextTotalPages : 1);
//       } catch (e) {
//         if (!aborted) {
//           setErr(e?.message || String(e));
//           setItems([]);
//           setPage(1);
//           setTotal(null);
//           setTotalPages(1);
//         }
//       } finally {
//         if (!aborted) setLoading(false);
//       }
//     }

//     loadFirst(debouncedQ);

//     return () => {
//       aborted = true;
//     };
//   }, [debouncedQ]);

//   // ===== 「もっと見る」 =====
//   async function handleLoadMore() {
//     // 旧APIで1ページしか取れてないときは何もしない
//     if (page >= totalPages) return;

//     const nextPage = page + 1;
//     setLoadingMore(true);
//     setErr("");

//     try {
//       const res = await fetchPlaces({
//         page: nextPage,
//         per,
//         q: debouncedQ?.trim?.() || "",
//       });

//       const data = Array.isArray(res) ? res : res.data || [];
//       const meta = res.meta || {};

//       setItems((prev) => [...prev, ...data]);
//       setPage(nextPage);

//       if (typeof meta.total === "number") setTotal(meta.total);
//       if (meta.total_pages) setTotalPages(meta.total_pages);
//     } catch (e) {
//       setErr(e?.message || String(e));
//     } finally {
//       setLoadingMore(false);
//     }
//   }

//   const shownCount = items.length;

//   return (
//     <>
//       <AppHeader />

//       <main className="mx-auto max-w-6xl px-4 pb-20 pt-16">
//         {/* タイトル + 右上アクション */}
//         <div className="mb-4 flex items-center justify-between gap-3">
//           <h1 className="text-2xl font-bold">Places_homepage</h1>
//           {isAuthed ? (
//             <Link
//               to="/mypage"
//               className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
//             >
//               My Page
//             </Link>
//           ) : (
//             <Link
//               to="/login"
//               className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
//             >
//               Log in
//             </Link>
//           )}
//         </div>

//         {/* 検索 + モード切り替え */}
//         <div className="mb-4 flex items-center gap-3">
//           <SearchBar
//             value={q}
//             onChange={setQ}
//             placeholder="場所名・都市・住所などで検索…"
//             suggestPath="/places/suggest"
//           />
//           <div className="ml-auto flex gap-1 rounded-xl bg-gray-100 p-1">
//             {["list", "grid", "map"].map((m) => (
//               <button
//                 key={m}
//                 onClick={() => setMode(m)}
//                 className={`rounded-lg px-3 py-2 text-sm capitalize transition ${
//                   mode === m
//                     ? "bg-white shadow-sm"
//                     : "text-gray-600 hover:bg-white/70"
//                 }`}
//               >
//                 {m}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* 件数表示（新APIのときだけちゃんと出る） */}
//         {typeof total === "number" && (
//           <div className="mb-2 text-sm text-gray-500">
//             {total} 件中 {shownCount} 件を表示
//           </div>
//         )}

//         {/* 読み込み中 */}
//         {loading && <div className="text-gray-500">Loading...</div>}

//         {/* エラー */}
//         {!!err && !loading && (
//           <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//             {err}
//           </div>
//         )}

//         {/* データなし */}
//         {!loading && !err && items.length === 0 && (
//           <div className="text-gray-500">該当する場所がありません。</div>
//         )}

//         {/* データあり */}
//         {!loading && !err && items.length > 0 && (
//           <>
//             <PlacesMain mode={mode} items={items} />

//             {/* 新APIでまだ残ってるときだけ「もっと見る」を出す。マップ表示中はいったん隠す */}
//             {mode !== "map" && page < totalPages && (
//               <div className="mt-6 flex justify-center">
//                 <button
//                   onClick={handleLoadMore}
//                   disabled={loadingMore}
//                   className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
//                 >
//                   {loadingMore ? "読み込み中…" : "もっと見る"}
//                 </button>
//               </div>
//             )}
//           </>
//         )}
//       </main>

//       <AppFooter />
//     </>
//   );
// }
