// src/components/PlacesMain.jsx
import ListView from "./views/ListView";
import GridView from "./views/GridView";
import MapView from "./views/MapView";

export default function PlacesMain({ mode, items }) {
  if (mode === "list") return <ListView items={items} />;
  if (mode === "map") return <MapView items={items} />;
  return <GridView items={items} />; // default
}

