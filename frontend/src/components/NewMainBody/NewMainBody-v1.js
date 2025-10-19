// v1

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
  ];

  const filtered = places.filter((p) =>
    (p.place_name + " " + p.address).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="bg-red-300">
      {/* 検索バー */}
      <section>
        <h1>検索</h1>
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>場所を検索</span>
            <input
              type="search"
              name="q"
              placeholder="場所名や住所で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button type="submit" className="bg-blue-400">
            Search
          </button>
        </form>
      </section>

      {/* リスト表示 */}
      <section>
        <h2>場所リスト</h2>
        <ul>
          {filtered.map(({ id, place_name, address }) => (
            <li key={id}>
              <article>
                <h3>{place_name}</h3>
                <p>{address}</p>
                <p>
                  <small>ID: {id}</small>
                </p>
              </article>
            </li>
          ))}
          {filtered.length === 0 && <li>該当する場所がありません</li>}
        </ul>
      </section>
    </main>
  );
}
