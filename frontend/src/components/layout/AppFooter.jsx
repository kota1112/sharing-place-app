import { useEffect, useState } from "react";
import { getToken } from "../../lib/api";

export default function AppFooter() {
  const [authed, setAuthed] = useState(!!(getToken() || localStorage.getItem("token")));

  useEffect(() => {
    const update = () => setAuthed(!!(getToken() || localStorage.getItem("token")));
    window.addEventListener("storage", update);
    window.addEventListener("auth:changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("auth:changed", update);
    };
  }, []);

  const items = authed
    ? [
        { href: "/place-homepage", label: "Home" },
        { href: "/place/new", label: "Post" },
        { href: "/mypage", label: "My Page" },
      ]
    : [
        { href: "/place-homepage", label: "Home" },
        { href: "/mypage", label: "My Page" },
      ];

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[max(env(safe-area-inset-bottom),0px)] shadow-sm backdrop-blur">
      <nav aria-label="Bottom navigation" className="mx-auto max-w-7xl">
        <ul className={`grid ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {items.map((it) => (
            <li key={it.href}>
              <a
                href={it.href}
                className="group flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60"
              >
                <span>{it.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
