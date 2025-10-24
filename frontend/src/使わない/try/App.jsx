import { BrowserRouter, Routes, Route, Link, Outlet } from "react-router-dom";
import Layout from "./Layout";

function Header() {
  return (
    <nav className="w-full flex items-center gap-4">
      <Link to="/" className="hover:underline">Home</Link>
      <Link to="/about" className="hover:underline">About</Link>
    </nav>
  );
}
function Footer() { return <div className="text-sm text-gray-600">© 2025</div>; }

function Shell() {
  return (
    <Layout header={<Header />} footer={<Footer />}>
      <Outlet /> {/* ここに各ページが差し込まれます */}
    </Layout>
  );
}

function Home()  { return <h1 className="text-2xl font-bold">Home</h1>; }
function About() { return <h1 className="text-2xl font-bold">About</h1>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
