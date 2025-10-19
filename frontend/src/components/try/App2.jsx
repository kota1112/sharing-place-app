// App.jsx
import AppLayout from "./AppLayout";

export default function App2() {
  return (
    <AppLayout header={<SiteHeader />} footer={<SiteFooter />}>
      <HomePage /> {/* ここがメイン（bodyの中身） */}
    </AppLayout>
  );
}

function SiteHeader() {
  return <nav>ヘッダー</nav>;
}
function SiteFooter() {
  return <div>フッター</div>;
}
function HomePage() {
  return <section>メインコンテンツ</section>;
}
