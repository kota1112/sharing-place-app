export default function Navbar() {
  return (
    <header className="bg-blue-400/90 backdrop-blur supports-[backdrop-filter]:bg-blue-400/70 sticky top-0 z-50 border-b border-white/20">
      <nav
        aria-label="Primary"
        className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8"
      >
        {/* 1レイアウトのみ：画面幅に応じて“縮む” */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-14 py-2">
          {/* Brand */}
          <a
            href="/home"
            className="text-white font-semibold text-base sm:text-lg tracking-tight hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded px-1"
          >
            Home
          </a>

          {/* Global nav（常に同じ構造。狭い時は詰める/スクロール） */}
          <ul className="flex items-center gap-3 sm:gap-5 text-sm sm:text-base overflow-x-auto whitespace-nowrap scrollbar-none">
            <li>
              <a
                href="#"
                className="text-white/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded px-1 py-0.5"
              >
                Features
              </a>
            </li>
          </ul>

          {/* Search（幅だけ縮む） */}
          <form
            action="#"
            method="get"
            role="search"
            className="ml-auto flex items-center gap-2 order-last sm:order-none"
          >
            <label className="sr-only">Search</label>
            <input
              type="search"
              name="q"
              placeholder="Search"
              className="h-9 w-28 xs:w-36 sm:w-44 md:w-64 rounded-md border border-white/30 bg-white/90 placeholder-slate-500 px-3 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center h-9 rounded-md px-3 text-xs sm:text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Search
            </button>
          </form>

          {/* Auth（同じ構造のまま文字サイズだけ調整） */}
          <div className="flex items-center gap-3 text-sm sm:text-base">
            <a
              href="#"
              className="text-white/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded px-1 py-0.5"
            >
              Log in
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
