// src/components/Pager.jsx
export default function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        onClick={() => canPrev && onChange(page - 1)}
        disabled={!canPrev}
      >
        ← Prev
      </button>
      <span className="text-sm text-gray-600">
        {page} / {totalPages}
      </span>
      <button
        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
        onClick={() => canNext && onChange(page + 1)}
        disabled={!canNext}
      >
        Next →
      </button>
    </div>
  );
}
