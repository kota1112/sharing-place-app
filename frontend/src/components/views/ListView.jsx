// src/components/views/ListView.jsx
import PlaceCard from "../PlaceCard";

export default function ListView({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((p) => (
        <PlaceCard key={p.id} place={p} layout="list" />
      ))}
    </div>
  );
}
