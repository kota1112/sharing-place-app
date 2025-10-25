export default function MyPlacesGrid({ items = [] }) {
  if (!items.length) return <p className="text-gray-500">まだありません。</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => (
        <a
          key={p.id}
          href={`/places/${p.id}`}
          className="rounded-xl border overflow-hidden hover:shadow-sm transition group"
        >
          <div className="aspect-video bg-gray-100">
            {p.first_photo_url ? (
              <img
                src={p.first_photo_url}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="p-3">
            <div className="font-semibold">{p.name}</div>
            <div className="text-gray-500 text-sm">
              {p.full_address || p.address_line || p.city || ""}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
