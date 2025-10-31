import MapView from "./views/MapView";
import GridView from "./views/GridView";
import ListView from "./views/ListView";
import SearchBar from "../components/SearchBar";

export default function PlacesMain({ mode, items }) {
  <SearchBar />;
  if (mode === "map") return <MapView items={items} />;
  if (mode === "list") return <ListView items={items} />;
  return <GridView items={items} />;
}
