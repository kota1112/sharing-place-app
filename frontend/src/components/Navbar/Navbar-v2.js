export default function Navbar() {
    return (
      <header className="bg-blue-400/90 backdrop-blur supports-[backdrop-filter]:bg-blue-400/70 sticky top-0 z-50 border-b border-white/20">
        <nav
          aria-label="Primary"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          {/* Top bar */}
          <div className="flex h-16 items-center justify-between">
            {/* Brand / Home */}
            <a
              href="/home"
              className="text-white font-semibold text-lg tracking-tight hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded px-1"
            >
              Home
            </a>
  
            {/* Desktop nav */}
            <ul className="hidden md:flex items-center gap-6">
              <li>
                <a
                  href="#"
                  className="text-white/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded px-1 py-0.5"
                >
                  Features
                </a>
              </li>
            </ul>
  
            {/* Desktop search */}
            <form
              action="#"
              method="get"
              role="search"
              className="hidden md:flex items-center gap-2"
            >
              <label className="sr-only">Search</label>
              <input
                type="search"
                name="q"
                placeholder="Search"
                className="h-9 w-44 lg:w-64 rounded-md border border-white/30 bg-white/90 placeholder-slate-500 px-3 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Search
              </button>
            </form>
  
            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="#"
                className="text-white/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded px-1 py-0.5"
              >
                Log in
              </a>
            </div>
  
            {/* Mobile menu button */}
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded="false"
              className="md:hidden inline-flex items-center gap-2 rounded-md px-3 py-2 text-white bg-blue-500/40 hover:bg-blue-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Menu
            </button>
          </div>
        </nav>
  
        {/* Mobile menu (static, responsive only) */}
        <div className="md:hidden border-t border-white/20">
          <div className="px-4 sm:px-6 lg:px-8 py-3 space-y-3">
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="block rounded px-2 py-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block rounded px-2 py-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block rounded px-2 py-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block rounded px-2 py-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  About
                </a>
              </li>
            </ul>
  
            <form
              action="#"
              method="get"
              role="search"
              className="flex items-center gap-2"
            >
              <label className="sr-only">Search</label>
              <input
                type="search"
                name="q"
                placeholder="Search"
                className="h-10 flex-1 rounded-md border border-white/30 bg-white/90 placeholder-slate-500 px-3 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              />
              <button
                type="submit"
                className="h-10 rounded-md px-3 text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Search
              </button>
            </form>
  
            <div>
              <a
                href="#"
                className="inline-flex items-center rounded px-2 py-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Log in
              </a>
            </div>
          </div>
        </div>
      </header>
    );
  }
  