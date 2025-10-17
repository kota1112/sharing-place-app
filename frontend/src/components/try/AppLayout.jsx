// AppLayout.jsx
export default function AppLayout({ header, children, footer }) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column"
      }}>
        <header style={{ position: "sticky", top: 0 }}>
          {header}
        </header>
  
        <main style={{ flex: 1 }}>
          {children}
        </main>
  
        <footer>
          {footer}
        </footer>
      </div>
    );
  }
  