// src/使う、参考/components/forMypage/MyPlacesList.jsx
import PlaceCard from "../../../使う、参考/components/PlaceCard";

export default function MyPlacesList({ items = [] }) {
  if (!items.length) return <p className="text-gray-500">まだありません。</p>;

  // List 用に PlaceCard を使う（layout="list"）
  return (
    <div className="grid gap-3">
      {items.map((p) => (
        <PlaceCard key={p.id} place={p} layout="list" />
      ))}
    </div>
  );
}
