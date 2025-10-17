import { api } from "../lib/api"; import { useEffect, useState } from "react";
export default function PlacesIndex(){
  const [items,setItems]=useState([]);
  useEffect(()=>{ api("/places").then(setItems); },[]);
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-3">
      {items.map(p=>(
        <a key={p.id} href={`/places/${p.id}`} className="block border p-3 rounded">
          <div className="font-semibold">{p.name}</div>
          <div className="text-sm text-gray-500">{p.city}</div>
        </a>
      ))}
    </div>
  );
}
