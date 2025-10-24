// src/components/PlaceCard.jsx
export default function PlaceCard({ place, layout = "grid" }) {
  const img = place.first_photo_url || null;

  return (
    <article
      className={`${
        layout === "list" ? "flex" : "block"
      } rounded-2xl border border-gray-200 bg-white transition hover:shadow-sm`}
    >
      <div
        className={`${
          layout === "list" ? "w-40 h-28" : "w-full h-48"
        } relative overflow-hidden rounded-t-2xl bg-gray-100 ${layout === "list" ? "rounded-l-2xl rounded-tr-none" : ""}`}
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

      <div className={`${layout === "list" ? "p-3" : "p-4"}`}>
        <div className="truncate font-semibold">{place.name}</div>
        <div className="text-sm text-gray-500">{place.city ?? "-"}</div>
        {place.description && (
          <div className="mt-1 line-clamp-2 text-sm text-gray-700">
            {place.description}
          </div>
        )}
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
