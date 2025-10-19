import { useState } from "react";

export default function NewMainBody() {
  const [query, setQuery] = useState("");

  // 一時データ（id, place_name, address）
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
  ];

  const filtered = places.filter((p) =>
    (p.place_name + " " + p.address).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* 検索バー */}
      <section className="">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          場所を探す
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          キーワードで場所名や住所を検索できます。
        </p>

        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="mt-4 flex w-full max-w-2xl items-center gap-2"
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

      {/* リスト表示 */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-slate-900">場所リスト</h2>
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
                    <h3 className="text-base sm:text-lg font-medium text-slate-900">
                      {place_name}
                    </h3>
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
  );
}
