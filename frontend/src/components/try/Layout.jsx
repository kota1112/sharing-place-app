export default function Layout({ header, children, footer }) {
  return (
    <div className="min-h-dvh">
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-white">
        <div className="mx-auto max-w-6xl h-full px-4 flex items-center">
          {header}
        </div>
      </header>

      <main id="main" className="pt-16">
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-4">{footer}</div>
      </footer>
    </div>
  );
}
