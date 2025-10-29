// src/components/AutocompleteSearchBar.jsx
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

// 入力 → デバウンスして /places/suggest or /places/suggest_mine を叩く
export default function AutocompleteSearchBar({
  value,
  onChange,
  placeholder = "検索…",
  scope = "public", // "public" | "mine"
  limit = 8,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  // クリックで外を押したら閉じる
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // デバウンス
  const [debounced, setDebounced] = useState(value || "");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value || ""), 200);
    return () => clearTimeout(t);
  }, [value]);

  // サジェスト取得
  useEffect(() => {
    let aborted = false;

    async function fetchSugs(q) {
      const v = String(q || "").trim();
      if (!v) {
        setSugs([]);
        return;
      }
      try {
        setLoading(true);
        const path =
          scope === "mine"
            ? `/places/suggest_mine?q=${encodeURIComponent(v)}&limit=${limit}`
            : `/places/suggest?q=${encodeURIComponent(v)}&limit=${limit}`;
        const data = await api(path); // ※ 認証は api() に委譲（mine のとき）
        if (!aborted) setSugs(Array.isArray(data) ? data : []);
      } catch {
        if (!aborted) setSugs([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchSugs(debounced);
    return () => {
      aborted = true;
    };
  }, [debounced, scope, limit]);

  return (
    <div ref={boxRef} className={`relative w-full ${className}`}>
      <input
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring"
      />
      {open && (loading || sugs.length > 0) && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">検索中…</div>
          )}
          {!loading &&
            sugs.map((s, i) => (
              <button
                key={`${s}-${i}`}
                type="button"
                onClick={() => {
                  onChange?.(s);
                  setOpen(false);
                }}
                className="block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50"
                title={s}
              >
                {s}
              </button>
            ))}
          {!loading && sugs.length === 0 && debounced.trim() !== "" && (
            <div className="px-3 py-2 text-sm text-gray-400">候補なし</div>
          )}
        </div>
      )}
    </div>
  );
}
