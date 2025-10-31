// src/components/PlaceCard.jsx
// 使い方:
// <PlaceCard place={p} layout="grid" onEdit={(id)=>...} onDelete={(id)=>...} />

export default function PlaceCard({
  place,
  layout = "grid",
  onEdit,           // 省略可: 渡せば「編集」ボタン表示
  onDelete,         // 省略可: 渡せば「削除」ボタン表示（confirm付き）
  showActions = true,
}) {
  const img = place.first_photo_url || null;

  const address =
    place.full_address ||
    place.address_line ||
    [place.city, place.state, place.postal_code, place.country]
      .filter(Boolean)
      .join(" ") ||
    "-";

  const isList = layout === "list";
  const isDeleted = !!place.deleted_at;

  // Google マップ URL を組み立て（place_id > 住所 > 緯度経度）
  function buildMapsUrl(p) {
    if (p?.google_place_id) {
      return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
        p.google_place_id
      )}`;
    }
    const addr =
      p?.full_address ||
      p?.address_line ||
      [p?.city, p?.state, p?.postal_code, p?.country].filter(Boolean).join(" ") ||
      "";
    const name = p?.name || "";
    const q = [name, addr].filter(Boolean).join(" ").trim();

    if (q) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }
    if (p?.latitude != null && p?.longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${p.latitude},${p.longitude}`
      )}`;
    }
    return null;
  }

  const mapsUrl = buildMapsUrl(place);

  const handleDelete = async () => {
    if (!onDelete) return;
    const ok = window.confirm(`「${place.name || "この場所"}」を削除しますか？`);
    if (!ok) return;
    await onDelete(place.id);
  };

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

        {isDeleted && (
          <span className="absolute left-2 top-2 rounded-full bg-rose-600/90 px-2 py-0.5 text-[10px] text-white">
            削除済み
          </span>
        )}
      </div>

      {/* 本文 */}
      <div className={`${isList ? "p-3 min-w-0 flex-1" : "p-4"}`}>
        {/* タイトル */}
        <div className="truncate font-semibold" title={place.name}>
          {place.name}
        </div>

        {/* 住所 */}
        <div className="truncate text-sm text-gray-500" title={address}>
          {address}
        </div>

        {/* 説明（2行省略） */}
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

        {/* アクション行 */}
        {showActions && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={`/places/${place.id}`}
              className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              詳細
            </a>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
                title="Google マップで開く"
              >
                Googleマップへ
              </a>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(place.id)}
                className="inline-flex items-center rounded-lg border border-sky-600 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
              >
                編集
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center rounded-lg border border-rose-400 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
              >
                削除
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
