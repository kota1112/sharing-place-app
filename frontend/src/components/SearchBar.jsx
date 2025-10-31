// src/components/SearchBar.jsx
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api"; // 位置に応じてパスが違う場合は調整

export default function SearchBar({
  value,
  onChange,
  onSubmit,                // 任意：Enterで検索確定させたい時に利用
  placeholder = "Search...",
  suggestPath,             // 例: "/places/suggest" or "/places/suggest_mine"
  debounceMs = 200,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [suggests, setSuggests] = useState([]);
  const [hi, setHi] = useState(-1); // ハイライト index
  const boxRef = useRef(null);
  const tRef = useRef(null);

  // 入力デバウンス → サジェスト取得
  useEffect(() => {
    if (!suggestPath) return; // サジェスト未指定なら動かさない
    clearTimeout(tRef.current);
    const q = String(value || "").trim();
    if (!q) {
      setSuggests([]);
      setOpen(false);
      setHi(-1);
      return;
    }
    tRef.current = setTimeout(async () => {
      try {
        const data = await api(`${suggestPath}?q=${encodeURIComponent(q)}`);
        if (Array.isArray(data)) {
          setSuggests(data);
          setOpen(data.length > 0);
          setHi(-1);
        } else {
          setSuggests([]);
          setOpen(false);
          setHi(-1);
        }
      } catch {
        setSuggests([]);
        setOpen(false);
        setHi(-1);
      }
    }, debounceMs);
    return () => clearTimeout(tRef.current);
  }, [value, suggestPath, debounceMs]);

  // 外クリックで閉じる
  useEffect(() => {
    function onDoc(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function commit(v) {
    onChange?.(v);
    // Enter確定を親に伝えたい場合のみ onSubmit を使う
    onSubmit?.(v);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open && e.key === "ArrowDown" && suggests.length > 0) {
      setOpen(true);
      setHi(0);
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((p) => Math.min(p + 1, suggests.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && hi < suggests.length) {
        commit(suggests[hi]);
      } else {
        commit(value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setHi(-1);
    }
  }

  return (
    <div ref={boxRef} className={`relative w-full ${className}`}>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => suggests.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring"
      />

      {open && suggests.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white shadow">
          {suggests.map((s, i) => (
            <button
              key={`${s}-${i}`}
              type="button"
              className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                i === hi ? "bg-gray-100" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // フォーカス移動で閉じないように
                commit(s);
              }}
              onMouseEnter={() => setHi(i)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
