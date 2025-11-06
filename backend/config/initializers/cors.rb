# config/initializers/cors.rb
# SPA(フロント) → Rails API へのクロスオリジン要求（CORS）設定。
# 既存の挙動（Authorization ヘッダの露出、開発用オリジン許可）を維持しつつ、
# 本番ドメインを環境変数で柔軟に追加できるようにし、Vercel のプレビュー URL も許可します。

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  # ---- 本番/開発 共通: 明示オリジン（環境変数 or 既定ローカル） ----
  allow do
    # 1) 最優先: FRONTEND_ORIGINS（カンマ区切りで複数）
    #    例) FRONTEND_ORIGINS="https://app.example.com,https://stg.example.com"
    raw_list = ENV.fetch("FRONTEND_ORIGINS", nil)
    env_list =
      if raw_list.present?
        raw_list.split(",").map(&:strip).reject(&:empty?)
      else
        []
      end

    # 2) 次点: FRONTEND_ORIGIN（単体）
    #    例) FRONTEND_ORIGIN="https://app.example.com"
    single = ENV.fetch("FRONTEND_ORIGIN", nil)
    env_single =
      if single.present?
        [single.strip]
      else
        []
      end

    # 3) どちらも無いときはローカル開発の既定オリジンを許可
    default_dev_origins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173"
    ]

    # 環境変数で指定されたものを優先、なければ開発用の値
    configured = (env_list + env_single).uniq

    # 値を正規化：
    # - 末尾スラッシュは除去
    # - スキームが無ければ https:// を付与（"example.com" → "https://example.com"）
    normalized =
      configured.map do |o|
        o = o.sub(%r{/\z}, "")
        o =~ %r{\Ahttps?://} ? o : "https://#{o}"
      end

    final_origins =
      if normalized.any?
        normalized
      else
        default_dev_origins
      end

    # Vercel のプレビュー URL も許可：
    # 例）https://sharing-place-xxxxxx-kota4869s-projects.vercel.app
    vercel_preview_regex = %r{\Ahttps://[a-z0-9-]+-kota4869s-projects\.vercel\.app\z}

    origins(*final_origins, vercel_preview_regex)

    resource "*",
             headers: :any,
             expose: %w[Authorization], # JWT をフロントで読めるように露出
             methods: %i[get post put patch delete options head],
             max_age: 86_400
  end

  # ---- 開発限定: 任意のローカルホスト:ポート を緩く許可 ----
  # 既存の 5173/4173 以外のポートで試すとき用。不要なら削除してOK。
  if Rails.env.development?
    allow do
      # http://localhost:3000 でも http://127.0.0.1:9999 でもいける
      origins %r{\Ahttp://(localhost|127\.0\.0\.1):\d+\z}
      resource "*",
               headers: :any,
               expose: %w[Authorization],
               methods: %i[get post put patch delete options head],
               max_age: 600
    end
  end
end
