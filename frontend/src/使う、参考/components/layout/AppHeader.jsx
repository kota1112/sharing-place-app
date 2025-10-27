// src/components/layout/AppHeader.jsx
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-blue-400/90 backdrop-blur supports-[backdrop-filter]:bg-blue-400/70">
      <nav
        aria-label="Primary"
        className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8"
      >
        <div className="min-h-14 flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
          {/* Brand / App name */}
          <a
            href="/place-homepage"
            className="rounded px-1 text-base font-semibold tracking-tight text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-lg"
          >
            Places
          </a>

          {/* Global nav */}
          <ul className="flex items-center gap-3 overflow-x-auto whitespace-nowrap text-sm text-white/90 sm:gap-5 sm:text-base">
            <li>
              <a
                href="/place-homepage"
                className="rounded px-1 py-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/place/new"
                className="rounded px-1 py-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Post
              </a>
            </li>
            <li>
              <a
                href="/mypage"
                className="rounded px-1 py-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                My Page
              </a>
            </li>
          </ul>

          {/* spacer to push auth to the right */}
          <div className="ml-auto" />

          {/* Auth (ダミー) */}
          <div className="flex items-center gap-3 text-sm sm:text-base">
            <a
              href="/login"
              className="rounded px-1 py-0.5 text-white/90 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Log in
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
