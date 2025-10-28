# frozen_string_literal: true

Devise.setup do |config|
  # Devise mailer
  config.mailer_sender = 'no-reply@example.com'

  # ORM
  require 'devise/orm/active_record'

  # 認証キー
  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]

  # API専用: セッションストレージ極力使わない
  config.skip_session_storage = [:http_auth]

  # パスワードハッシュ強度
  config.stretches = Rails.env.test? ? 1 : 12

  # 再確認メール（confirmable使用時）
  config.reconfirmable = true

  # パスワード条件
  config.password_length = 6..128
  config.email_regexp    = /\A[^@\s]+@[^@\s]+\z/

  # Remember me のCookie関連
  config.expire_all_remember_me_on_sign_out = true

  # JSON API に最適化（HTML リダイレクト無効）
  config.navigational_formats = []

  # サインアウトHTTPメソッド
  config.sign_out_via = :delete

  # Devise の Hotwire/Turbo 用レスポンス（Rails8 既定に合わせる）
  config.responder.error_status    = :unprocessable_entity
  config.responder.redirect_status = :see_other

  # =========================
  # JWT (devise-jwt) 設定
  # =========================
  # ルーティングは `scope :auth` で devise_for を宣言している前提なので、
  # サインイン/アウトのパスは /auth/sign_in, /auth/sign_out になります。
  config.jwt do |jwt|
    # 本番は ENV か credentials から必ず供給すること
    secret = ENV['DEVISE_JWT_SECRET_KEY'] ||
             Rails.application.credentials.dig(:devise_jwt_secret_key) ||
             ((Rails.env.development? || Rails.env.test?) ? 'dev' : nil)
    raise "Missing DEVISE_JWT_SECRET_KEY (set ENV or credentials)" if secret.nil?

    jwt.secret = secret

    # JWT を発行するリクエスト（ログイン）
    jwt.dispatch_requests = [
      ['POST', %r{^/auth/sign_in$}]
    ]

    # JWT を失効させるリクエスト（ログアウト）
    jwt.revocation_requests = [
      ['DELETE', %r{^/auth/sign_out$}]
    ]

    # 有効期限（フェーズ0の方針に合わせて24時間）
    jwt.expiration_time = 24.hours.to_i
  end

  # ここで独自 Warden 設定が必要なら有効化
  # config.warden do |manager|
  #   manager.intercept_401 = false
  # end
end
