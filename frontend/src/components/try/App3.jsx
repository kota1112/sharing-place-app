import React from 'react'

function App3() {
  return (
    <Layout
      header={<SiteHeader />}
      footer={<SiteFooter />}
    >
      <HomePage /> {/* ここがメイン（bodyの中身） */}
    </Layout>
  )
}

function SiteHeader() { return <nav>ヘッダー</nav>; }
function SiteFooter() { return <div>フッター</div>; }
function HomePage()   { return <section>メインコンテンツ</section>; }

export default App3