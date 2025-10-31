// src/components/forMypage/MyPlacesList.jsx
import PlaceCard from "../PlaceCard";

export default function MyPlacesList({ items = [], onEdit, onDelete }) {
  if (!items.length) return <p className="text-gray-500">まだありません。</p>;

  return (
    <div className="grid gap-3">
      {items.map((p) => (
        <PlaceCard
          key={p.id}
          place={p}
          layout="list"
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
