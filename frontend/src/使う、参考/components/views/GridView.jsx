// src/components/views/GridView.jsx
import PlaceCard from "../PlaceCard";

export default function GridView({ items }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <PlaceCard key={p.id} place={p} layout="grid" />
      ))}
    </div>
  );
}
