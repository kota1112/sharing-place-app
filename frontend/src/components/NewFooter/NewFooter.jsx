//v2

export default function NefFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur shadow-sm pb-[max(env(safe-area-inset-bottom),0px)]">
      <nav aria-label="Bottom navigation" className="mx-auto max-w-7xl">
        <ul className="grid grid-cols-3">
          <li>
            <a
              href="/home"
              aria-current="page"
              className="group flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-slate-600 hover:text-slate-900 aria-[current=page]:text-blue-600 aria-[current=page]:font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60"
            >
              <span>Home</span>
            </a>
          </li>
          <li>
            <a
              href="/post"
              className="group flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60"
            >
              <span>Post</span>
            </a>
          </li>
          <li>
            <a
              href="/new-mypage"
              className="group flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60"
            >
              <span>My Page</span>
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
