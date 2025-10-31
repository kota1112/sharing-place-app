export default function ViewToggle({ mode, onChange }) {
  const btn =
    "px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 transition";
  const active =
    "bg-gray-900 text-white border-gray-900 hover:bg-gray-800";

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`${btn} ${mode === "list" ? active : ""}`}
      >
        List
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`${btn} ${mode === "grid" ? active : ""}`}
      >
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange("map")}
        className={`${btn} ${mode === "map" ? active : ""}`}
      >
        Map
      </button>
    </div>
  );
}
