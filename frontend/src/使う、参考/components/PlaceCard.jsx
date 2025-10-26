// src/使う、参考/components/PlaceCard.jsx
export default function PlaceCard({ place, layout = "grid" }) {
  const img = place.first_photo_url || null;

  const address =
    place.full_address ||
    place.address_line ||
    [place.city, place.state, place.postal_code, place.country]
      .filter(Boolean)
      .join(" ") ||
    "-";

  const isList = layout === "list";

  return (
    <article
      className={`${isList ? "flex" : "block"} rounded-2xl border border-gray-200 bg-white transition hover:shadow-sm`}
    >
      {/* サムネイル */}
      <div
        className={`${isList ? "w-40 h-28 rounded-l-2xl rounded-tr-none" : "w-full h-48 rounded-t-2xl"} relative overflow-hidden bg-gray-100`}
      >
        {img ? (
          <img
            src={img}
            alt={place.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-gray-400">
            no photo
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-gray-600">
          ID: {place.id}
        </span>
      </div>

      {/* 本文 */}
      <div className={`${isList ? "p-3 min-w-0 flex-1" : "p-4"}`}>
        {/* タイトル */}
        <div className="truncate font-semibold" title={place.name}>
          {place.name}
        </div>

        {/* 住所 */}
        <div className="text-sm text-gray-500 truncate" title={address}>
          {address}
        </div>

        {/* 説明（2行に収めて省略。プラグイン不要の CSS） */}
        {place.description && (
          <div
            className="mt-1 text-sm text-gray-700"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
              maxWidth: "100%",
            }}
            title={place.description}
          >
            {place.description}
          </div>
        )}

        {/* 以前のデザインに戻した「詳細を見る」 */}
        <a
          href={`/places/${place.id}`}
          className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
        >
          詳細を見る →
        </a>
      </div>
    </article>
  );
}
