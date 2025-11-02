# backend/app/controllers/users/omniauth_callbacks_controller.rb
class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  # CI / test で Devise 側の before_action がまだ挿さってない瞬間に
  # このクラスが読み込まれると
  #   "Before process_action callback :verify_authenticity_token has not been defined"
  # で落ちるので、防御的に書いておく
  begin
    skip_before_action :verify_authenticity_token, raise: false
  rescue ArgumentError
    # ここに来たら「そもそもまだコールバックが無い」だけなので放置でOK
  end

  def google_oauth2
    # OmniAuth が返してくる情報
    auth = request.env["omniauth.auth"]
    if auth.nil?
      render json: { error: "No auth info" }, status: :unprocessable_entity
      return
    end

    # メールでユーザーを探す（小文字にそろえておく）
    email = auth.info.email.to_s.downcase
    user  = User.find_by(email: email)

    # 見つからなければ新規作成
    unless user
      user = User.new(
        email:        email,
        password:     Devise.friendly_token.first(20),
        display_name: auth.info.name
      )
      user.save!
    end

    # social_identities を保存 / 更新
    identity = SocialIdentity.find_or_initialize_by(
      provider:     auth.provider,
      provider_uid: auth.uid
    )
    identity.user          = user
    identity.access_token  = auth.credentials.token
    identity.refresh_token = auth.credentials.refresh_token if auth.credentials.refresh_token.present?
    identity.expires_at    = Time.at(auth.credentials.expires_at) if auth.credentials.expires_at
    identity.raw_info      = auth.to_h
    identity.save!

    # Devise JWT でトークンを発行してフロントにリダイレクト
    jwt, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    redirect_to after_oauth_redirect_url(jwt)
  rescue => e
    # ここは () でまとめておかないと CI の Ruby が構文エラーになる
    Rails.logger.error(
      "[google_oauth2] #{e.class}: #{e.message}\n" +
      Array(e.backtrace).first(3).join("\n")
    )
    render json: { error: "OAuth failed" }, status: :internal_server_error
  end

  private

  # フロントの受け口に token を付けて返す
  # 例) http://localhost:5173/oauth/callback?token=xxxxx
  def after_oauth_redirect_url(token)
    base = ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")
    path = "/oauth/callback"
    "#{base}#{path}?token=#{CGI.escape(token)}"
  end
end
