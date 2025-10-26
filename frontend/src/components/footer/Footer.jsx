export default function Footer() {
  // 固定フッター（高さ: 56px = h-14）。要素を等間隔で配置（grid-cols-4）。
  return (
  <footer className="fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-emerald-200/70 bg-emerald-50/80 backdrop-blur supports-[backdrop-filter]:bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/40">
  <nav className="container mx-auto grid h-full grid-cols-4 divide-x divide-emerald-200/60 px-0 text-sm dark:divide-emerald-900/40">
  {[
  { label: 'Home', href: '/' },
  { label: 'Features', href: '#features' },
  { label: 'Contact', href: '#contact' },
  { label: 'Theme', onClick: () => {
  const html = document.documentElement
  html.classList.toggle('dark')
  localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light'
  } },
  ].map((item, i) => (
  item.href ? (
  <a
  key={i}
  href={item.href}
  className="flex items-center justify-center gap-1 hover:bg-emerald-100/60 focus:outline-none focus:ring focus:ring-emerald-200 dark:hover:bg-emerald-900/30"
  >
  <span>{item.label}</span>
  </a>
  ) : (
  <button
  key={i}
  onClick={item.onClick}
  className="flex items-center justify-center gap-1 hover:bg-emerald-100/60 focus:outline-none focus:ring focus:ring-emerald-200 dark:hover:bg-emerald-900/30"
  >
  <span>{item.label}</span>
  </button>
  )
  ))}
  </nav>
  {/* iOS セーフエリア対策 */}
  <div className="pointer-events-none h-[env(safe-area-inset-bottom)]" />
  </footer>
  )
  }