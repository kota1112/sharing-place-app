// src/使う、参考/components/forMypage/MyPlacesList.jsx
export default function MyPlacesList({ items = [] }) {
  if (!items.length) return <p className="text-gray-500">まだありません。</p>;

  return (
    <ul className="space-y-3">
      {items.map((p) => {
        const address =
          p.full_address || p.address_line || p.city || p.state || "" ;
        const hasThumb = Boolean(p.first_photo_url);

        return (
          <li
            key={p.id}
            className="rounded-xl border p-4 hover:shadow-sm transition bg-white"
          >
            <div className="flex gap-4 items-start">
              {/* 本文 */}
              <div className="min-w-0 flex-1">
                <a
                  href={`/places/${p.id}`}
                  className="font-semibold hover:underline block truncate"
                  title={p.name}
                >
                  {p.name}
                </a>

                <div
                  className="text-gray-500 text-sm truncate"
                  title={address}
                >
                  {address}
                </div>

                {p.description && (
                  <p
                    className="text-sm mt-2 text-gray-700 line-clamp-2"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                    title={p.description}
                  >
                    {p.description}
                  </p>
                )}
              </div>

              {/* サムネイル */}
              {hasThumb ? (
                <img
                  src={p.first_photo_url}
                  alt={p.name || ""}
                  className="w-28 h-20 object-cover rounded-lg shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-28 h-20 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                  No image
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
