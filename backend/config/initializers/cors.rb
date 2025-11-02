# config/initializers/cors.rb
# SPA(フロント) → Rails API へのクロスオリジン要求を許可する設定
# 既存の挙動（Authorization ヘッダの露出、開発用オリジン許可）は維持しつつ、
# 環境変数で本番ドメインを柔軟に追加できるようにしています。

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
        [single]
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
    final_origins =
      if env_list.any?
        env_list
      elsif env_single.any?
        env_single
      else
        default_dev_origins
      end

    origins(*final_origins)

    resource "*",
             headers: :any,
             expose: %w[Authorization], # ← JWT をJSから読めるように
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
