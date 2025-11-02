# config/initializers/devise.rb
# frozen_string_literal: true

Devise.setup do |config|
  # 送信元
  config.mailer_sender = "no-reply@example.com"

  # ORM
  require "devise/orm/active_record"

  # 認証キー（メールは大文字小文字を区別しない）
  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]

  # API専用: セッションは極力使わない
  config.skip_session_storage = [:http_auth]

  # パスワードハッシュ強度
  config.stretches = Rails.env.test? ? 1 : 12

  # 再確認メール（confirmable使用時）
  config.reconfirmable = true

  # パスワード・メールの基本バリデーション
  config.password_length = 6..128
  config.email_regexp    = /\A[^@\s]+@[^@\s]+\z/

  # Remember me のCookie関連
  config.expire_all_remember_me_on_sign_out = true

  # JSON APIに最適化（HTMLリダイレクト無効）
  config.navigational_formats = []

  # サインアウトHTTPメソッド
  config.sign_out_via = :delete

  # Rails 8 / Turbo まわり
  config.responder.error_status    = :unprocessable_entity
  config.responder.redirect_status = :see_other

  # =========================================================
  # （任意）OmniAuth Google - リダイレクト方式を使う場合のみ有効化
  # ---------------------------------------------------------
  # 今回のアプリは「GISでid_tokenを取って /auth/google に投げる」方式を
  # メインにしているので、このブロックは基本的に動かなくてもOK。
  # 将来「Googleでリダイレクトログインもしたい」となったときだけ
  # USE_OMNIAUTH_GOOGLE=true で有効にする。
  # =========================================================
  if ENV["USE_OMNIAUTH_GOOGLE"] == "true"
    begin
      require "omniauth"
      require "omniauth-google-oauth2"

      if ENV["GOOGLE_CLIENT_ID"].present? && ENV["GOOGLE_CLIENT_SECRET"].present?
        config.omniauth :google_oauth2,
                        ENV["GOOGLE_CLIENT_ID"],
                        ENV["GOOGLE_CLIENT_SECRET"],
                        {
                          scope:  "openid,email,profile",
                          prompt: "select_account",
                          access_type: "offline",
                        }
        OmniAuth.config.allowed_request_methods = %i[get post]
      else
        Rails.logger.warn("[Devise/OmniAuth] GOOGLE_CLIENT_ID/SECRET が未設定のため、Google連携は無効です")
      end
    rescue LoadError
      Rails.logger.warn("[Devise/OmniAuth] omniauth 系 gem が見つかりません。id_token 直投げ方式のみで運用します")
    end
  end

  # =========================
  # JWT (devise-jwt) 設定
  # =========================
  # ルーティングは `scope :auth` で devise_for を宣言している前提なので、
  # サインイン/アウトのパスは /auth/sign_in, /auth/sign_out になります。
  # さらに /auth/google（トークン直投げ方式）でもJWTを自動発行します。
  config.jwt do |jwt|
    # 1. 本番は必ず ENV or credentials から読む
    # 2. 開発・テストだけならダミーでもOK
    secret =
      ENV["DEVISE_JWT_SECRET_KEY"] ||
      Rails.application.credentials.dig(:devise_jwt_secret_key) ||
      ((Rails.env.development? || Rails.env.test?) ? "dev" : nil)

    if secret.nil?
      # 本番でここに来たら環境変数不足なので明示的に落とす
      raise "Missing DEVISE_JWT_SECRET_KEY (set ENV or credentials)"
    end

    jwt.secret = secret

    # JWT を発行するリクエスト
    jwt.dispatch_requests = [
      # 通常のメール/パスワードログイン
      ["POST", %r{^/auth/sign_in$}],
      # GIS でとった id_token を投げるやつ
      ["POST", %r{^/auth/google$}],
    ]

    # JWT を失効させるリクエスト（ログアウト）
    jwt.revocation_requests = [
      ["DELETE", %r{^/auth/sign_out$}],
    ]

    # 有効期限
    # 環境変数 DEVISE_JWT_EXP_MIN=30 とかにすると30分にできる
    # 指定がなければ従来どおり24時間(1440分)
    exp_minutes = ENV.fetch("DEVISE_JWT_EXP_MIN", "1440").to_i
    jwt.expiration_time = exp_minutes.minutes.to_i
  end

  # ここで独自 Warden 設定が必要なら有効化
  # config.warden do |manager|
  #   manager.intercept_401 = false
  # end
end
