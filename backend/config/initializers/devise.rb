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

  # Devise の Hotwire/Turbo 用レスポンス（Rails 8 既定に合わせる）
  config.responder.error_status    = :unprocessable_entity
  config.responder.redirect_status = :see_other

  # =========================================================
  # （任意）OmniAuth Google - リダイレクト方式を使う場合のみ有効化
  # ---------------------------------------------------------
  # ※ Gemfile に 'omniauth' と 'omniauth-google-oauth2' が入っていない環境で
  #   ここを実行すると起動失敗するため、厳密にガードしています。
  #   環境変数 USE_OMNIAUTH_GOOGLE=true がセットされている時だけ有効にします。
  #   （id_token 直投げ方式のみで運用する場合は何も設定不要）
  # =========================================================
  if ENV['USE_OMNIAUTH_GOOGLE'] == 'true'
    begin
      require 'omniauth'
      require 'omniauth-google-oauth2'

      if ENV['GOOGLE_CLIENT_ID'].present? && ENV['GOOGLE_CLIENT_SECRET'].present?
        config.omniauth :google_oauth2,
                        ENV['GOOGLE_CLIENT_ID'],
                        ENV['GOOGLE_CLIENT_SECRET'],
                        {
                          scope:  'openid,email,profile',
                          prompt: 'select_account',
                          access_type: 'offline'
                        }
        OmniAuth.config.allowed_request_methods = %i[get post]
      else
        Rails.logger.warn('[Devise/OmniAuth] GOOGLE_CLIENT_ID/SECRET が未設定のため、Google連携は無効です')
      end
    rescue LoadError
      Rails.logger.warn('[Devise/OmniAuth] omniauth 系 gem が見つかりません。id_token 直投げ方式のみで運用します')
    end
  end

  # =========================
  # JWT (devise-jwt) 設定
  # =========================
  # ルーティングは `scope :auth` で devise_for を宣言している前提なので、
  # サインイン/アウトのパスは /auth/sign_in, /auth/sign_out になります。
  # さらに /auth/google（トークン直投げ方式）でもJWTを自動発行します。
  config.jwt do |jwt|
    # 本番は ENV か credentials から必ず供給すること
    secret = ENV['DEVISE_JWT_SECRET_KEY'] ||
             Rails.application.credentials.dig(:devise_jwt_secret_key) ||
             ((Rails.env.development? || Rails.env.test?) ? 'dev' : nil)
    raise "Missing DEVISE_JWT_SECRET_KEY (set ENV or credentials)" if secret.nil?

    jwt.secret = secret

    # JWT を発行するリクエスト
    jwt.dispatch_requests = [
      ['POST', %r{^/auth/sign_in$}],
      # ↓ Google の「id_token直投げ」エンドポイント（OauthController#google）
      ['POST', %r{^/auth/google$}]
      # ※ OmniAuth リダイレクト方式を併用する場合は、CallbacksController 側で
      #    明示的に sign_in すればミドルウェアが付与します（ここに追加不要）
    ]

    # JWT を失効させるリクエスト（ログアウト）
    jwt.revocation_requests = [
      ['DELETE', %r{^/auth/sign_out$}]
    ]

    # 有効期限（既存方針：24時間）
    jwt.expiration_time = 24.hours.to_i
  end

  # ここで独自 Warden 設定が必要なら有効化
  # config.warden do |manager|
  #   manager.intercept_401 = false
  # end
end
