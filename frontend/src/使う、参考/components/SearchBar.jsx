// src/components/SearchBar.jsx
export default function SearchBar({ value, onChange, onSubmit }) {
  return (
    <div className="flex w-full max-w-3xl items-center gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: 渋谷 / 大阪 / cafe など"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring"
      />
      <button
        onClick={onSubmit}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
      >
        Search
      </button>
    </div>
  );
}

