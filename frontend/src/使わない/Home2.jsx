export default function Home2() {
    return (
    <main className="container mx-auto flex-1 rounded-none border-x-0 bg-amber-50/50 px-4 py-10 dark:bg-amber-950/20">
    <span className="mb-4 inline-block rounded-full border border-amber-300/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">Main</span>
    
    
    {/* Hero */}
    <section className="grid gap-6 lg:grid-cols-2 lg:items-center">
    <div>
    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">React × Tailwind で最速開発</h1>
    <p className="mt-3 text-gray-700 dark:text-gray-300">軽量な構成で、すぐに本質の開発へ。ユーティリティクラスで見た目もスピーディに仕上がります。</p>
    <div className="mt-5 flex gap-3">
    <a href="#features" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95 focus:ring focus:ring-indigo-200">特徴を見る</a>
    <a href="#contact" className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-100 focus:ring focus:ring-indigo-200 dark:text-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">問い合わせ</a>
    </div>
    </div>
    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">
    UI プレビュー領域（後でグラフやスクリーンショットを置けます）
    </div>
    </section>
    
    
    {/* Features */}
    <section id="features" className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {["高速な開発体験","直感的なスタイリング","拡張しやすい設計"].map((title, i) => (
    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
    <h3 className="mb-2 text-lg font-semibold tracking-tight">{title}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-300">ダミーの説明テキスト。必要に応じて実装に置き換えてください。</p>
    </div>
    ))}
    </section>
    
    
    {/* Contact */}
    <section id="contact" className="mt-14">
    <h2 className="text-xl font-semibold tracking-tight">お問い合わせ</h2>
    <form className="mt-4 grid gap-3 sm:max-w-md">
    <label className="block">
    <span className="text-sm">メールアドレス</span>
    <input type="email" placeholder="you@example.com" className="mt-1 w-full rounded-xl border border-gray-300 bg-white/70 px-3 py-2 shadow-sm outline-none focus:ring focus:ring-indigo-200 dark:bg-gray-800 dark:border-gray-700" />
    </label>
    <label className="block">
    <span className="text-sm">メッセージ</span>
    <textarea rows="3" className="mt-1 w-full rounded-xl border border-gray-300 bg-white/70 px-3 py-2 shadow-sm outline-none focus:ring focus:ring-indigo-200 dark:bg-gray-800 dark:border-gray-700" />
    </label>
    <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95 focus:ring focus:ring-indigo-200">送信</button>
    </form>
    </section>
    </main>
    )
    }