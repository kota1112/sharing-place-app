# config/initializers/cors.rb
# SPA(フロント) → Rails API へのクロスオリジン要求を許可する設定
# 既存の挙動（Authorization ヘッダの露出、開発用オリジン許可）は維持しつつ、
# 環境変数で本番ドメインを柔軟に追加できるようにしています。

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  # ---- 本番/開発 共通: 明示オリジン（環境変数 or 既定ローカル） ----
  allow do
    # 環境変数 FRONTEND_ORIGINS でカンマ区切り指定可
    # 例) FRONTEND_ORIGINS="https://app.example.com,https://stg.example.com"
    raw = ENV.fetch('FRONTEND_ORIGINS', nil)
    env_origins = raw.present? ? raw.split(',').map(&:strip) : []

    # 既定の開発オリジン（Vite の dev/preview 両方を網羅）
    default_dev_origins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173'
    ]

    # 環境変数があればそれを優先、無ければ既定の開発オリジンを許可
    origins(*(env_origins.presence || default_dev_origins))

    resource '*',
      headers: :any,
      expose: %w[Authorization],                    # ← JWT を受け取るため
      methods: %i[get post put patch delete options head],
      max_age: 86_400
  end

  # ---- 開発限定: 任意のローカルホスト:ポート を緩く許可（必要に応じて）----
  # 既存の 5173/4173 以外のポートで試す際に便利。不要なら削除可。
  if Rails.env.development?
    allow do
      origins %r{\Ahttp://(localhost|127\.0\.0\.1):\d+\z}
      resource '*',
        headers: :any,
        expose: %w[Authorization],
        methods: %i[get post put patch delete options head],
        max_age: 600
    end
  end
end
