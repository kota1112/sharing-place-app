export default function MyPlacesList({ items = [] }) {
  if (!items.length) return <p className="text-gray-500">まだありません。</p>;

  return (
    <ul className="space-y-3">
      {items.map((p) => (
        <li key={p.id} className="rounded-xl border p-4 hover:shadow-sm transition">
          <div className="flex items-start justify-between gap-3">
            <div>
              <a href={`/places/${p.id}`} className="font-semibold hover:underline">
                {p.name}
              </a>
              <div className="text-gray-500 text-sm">
                {p.full_address || p.address_line || p.city || ""}
              </div>
              {p.description && (
                <p className="text-sm mt-2 text-gray-700 line-clamp-2">{p.description}</p>
              )}
            </div>
            {p.first_photo_url && (
              <img
                src={p.first_photo_url}
                alt={p.name}
                className="w-28 h-20 object-cover rounded-lg"
                loading="lazy"
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
