export default function SearchBar({ value, onChange, onSubmit, placeholder }) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 rounded-xl border px-4 py-2 focus:outline-none focus:ring"
        placeholder={placeholder || "例: 渋谷 / 大阪城 / 京都駅 など"}
      />
      <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
        Search
      </button>
    </form>
  );
}
