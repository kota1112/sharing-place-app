import { useMemo, useState } from "react";

export default function NewMypageMain() {
  const [query, setQuery] = useState("");

  // ダミーデータ20件（id, place_name, address）
  const places = [
    {
      id: 1,
      place_name: "渋谷スクランブル交差点",
      address: "東京都渋谷区道玄坂2丁目",
    },
    { id: 2, place_name: "浅草寺", address: "東京都台東区浅草2丁目" },
    { id: 3, place_name: "大阪城公園", address: "大阪府大阪市中央区大阪城" },
    {
      id: 4,
      place_name: "京都駅",
      address: "京都府京都市下京区東塩小路釜殿町",
    },
    { id: 5, place_name: "中之島公園", address: "大阪府大阪市北区中之島1" },
    { id: 6, place_name: "東京タワー", address: "東京都港区芝公園4-2-8" },
    {
      id: 7,
      place_name: "伏見稲荷大社",
      address: "京都府京都市伏見区深草藪之内町68",
    },
    {
      id: 8,
      place_name: "札幌市時計台",
      address: "北海道札幌市中央区北1条西2丁目",
    },
    { id: 9, place_name: "名古屋城", address: "愛知県名古屋市中区本丸1-1" },
    {
      id: 10,
      place_name: "広島平和記念公園",
      address: "広島県広島市中区中島町",
    },
    { id: 11, place_name: "上野公園", address: "東京都台東区上野公園" },
    {
      id: 12,
      place_name: "鎌倉大仏（高徳院）",
      address: "神奈川県鎌倉市長谷4-2-28",
    },
    {
      id: 13,
      place_name: "東京スカイツリー",
      address: "東京都墨田区押上1-1-2",
    },
    { id: 14, place_name: "金閣寺", address: "京都府京都市北区金閣寺町1" },
    {
      id: 15,
      place_name: "仙台城跡（青葉城址）",
      address: "宮城県仙台市青葉区川内",
    },
    { id: 16, place_name: "博多駅", address: "福岡県福岡市博多区博多駅中央街" },
    {
      id: 17,
      place_name: "国際通り",
      address: "沖縄県那覇市牧志・久茂地 付近",
    },
    { id: 18, place_name: "横浜中華街", address: "神奈川県横浜市中区山下町" },
    {
      id: 19,
      place_name: "神戸メリケンパーク",
      address: "兵庫県神戸市中央区波止場町",
    },
    {
      id: 20,
      place_name: "富士山五合目（吉田口）",
      address: "山梨県南都留郡富士河口湖町",
    },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter((p) =>
      (p.place_name + " " + p.address).toLowerCase().includes(q)
    );
  }, [query, places]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          My Page
        </h1>
        <p className="mt-1 text-slate-600">
          Account: <strong className="text-slate-900">your_username</strong>
        </p>
      </header>

      <main>
        {/* 検索バー（ホームと同等のUI） */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900">検索</h2>
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="mt-3 flex w-full max-w-2xl items-center gap-2"
          >
            <label className="sr-only">場所を検索</label>
            <input
              type="search"
              name="q"
              placeholder="例：渋谷 / 大阪城 / 京都駅 など"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white/90 px-3 text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/70"
            >
              Search
            </button>
          </form>
        </section>

        {/* リスト表示（ホームと同等のカードUI） */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-semibold text-slate-900">場所リスト</h3>
            <span className="text-sm text-slate-500">
              {filtered.length} / {places.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-slate-600">
              該当する場所がありません。キーワードを変えてみてください。
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:gap-4">
              {filtered.map(({ id, place_name, address }) => (
                <li key={id}>
                  <article className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur px-4 py-3 shadow-sm transition hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                      <h4 className="text-base sm:text-lg font-medium text-slate-900">
                        {place_name}
                      </h4>
                      <small className="text-xs text-slate-500">ID: {id}</small>
                    </div>
                    <p className="mt-1 text-slate-600">{address}</p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
