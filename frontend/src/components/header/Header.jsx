export default function Header() {
  return (
  <header className="sticky top-0 z-40 w-full border-b border-indigo-200/70 bg-indigo-50/80 backdrop-blur dark:border-indigo-900/40 dark:bg-indigo-950/40">
  <div className="container mx-auto flex h-14 items-center justify-between px-4">
  <a href="/" className="flex items-center gap-2">
  <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500" />
  <span className="font-semibold tracking-tight">My WebApp</span>
  </a>
  <nav className="flex items-center gap-1 text-sm">
  <span className="mr-2 rounded-full border border-indigo-300/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-200">Header</span>
  <a className="rounded-xl px-3 py-2 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40" href="#features">特徴</a>
  <a className="rounded-xl px-3 py-2 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40" href="#contact">問い合わせ</a>
  <button
  className="rounded-xl px-3 py-2 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40"
  onClick={() => {
  const html = document.documentElement
  html.classList.toggle('dark')
  localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light'
  }}
  >テーマ</button>
  </nav>
  </div>
  </header>
  )
  }