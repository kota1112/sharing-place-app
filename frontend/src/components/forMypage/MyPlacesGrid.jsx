// src/components/forMypage/MyPlacesGrid.jsx
import PlaceCard from "../PlaceCard";

export default function MyPlacesGrid({ items = [], onEdit, onDelete }) {
  if (!items.length) return <p className="text-gray-500">まだありません。</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <PlaceCard
          key={p.id}
          place={p}
          layout="grid"
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
