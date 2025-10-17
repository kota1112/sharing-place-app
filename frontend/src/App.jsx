import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Home2 from "./pages/Home2";

export default function App() {
return (
// ヘッダー: h-14 固定、フッター: h-14 固定
// => 本文に pt-14 / pb-14 を確保して重なりを回避
<div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-50">
<Header />


<div className="pt-14 pb-14 min-h-screen flex flex-col">
<Home2/>
</div>


<Footer />
</div>
)
}