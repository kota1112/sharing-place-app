# backend/app/controllers/users/omniauth_callbacks_controller.rb
class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  # CI 環境だと Devise::OmniauthCallbacksController 側に
  # :verify_authenticity_token が定義されていないタイミングでこのクラスが
  # 読まれてしまい、"callback ... has not been defined" で落ちることがある。
  #
  # → raise: false を付けて「なかったらスキップしない」で通す。
  #   さらに念のため begin/rescue で囲んでおく。
  begin
    skip_before_action :verify_authenticity_token, raise: false
  rescue ArgumentError
    # ここに来るのは「そもそも before_action がまだ差さってない」ケースなので
    # 何もしなくてOK
  end

  def google_oauth2
    # OmniAuth からの情報を取る（nil なら設定/URIミスマッチ）
    auth = request.env["omniauth.auth"]
    return render json: { error: "No auth info" }, status: :unprocessable_entity if auth.nil?

    # メールでユーザーを探す（小文字化しておく）
    email = auth.info.email.to_s.downcase
    user  = User.find_by(email: email)

    # ユーザーがいなければ作成
    unless user
      user = User.new(
        email: email,
        password: Devise.friendly_token.first(20),
        display_name: auth.info.name
      )
      user.save!
    end

    # SocialIdentity を関連付ける / 更新する
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

    # JWT を発行してフロントに返す
    token  = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
    target = after_oauth_redirect_url(token)
    redirect_to target
  rescue => e
    Rails.logger.error(
      "[google_oauth2] #{e.class}: #{e.message}\n" \
      Array(e.backtrace).first(3).join("\n")
    )
    render json: { error: "OAuth failed" }, status: :internal_server_error
  end

  private

  # フロントへ戻す先（SignUp.jsx / LogIn.jsx の想定に合わせる）
  def after_oauth_redirect_url(token)
    base = ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")
    path = "/oauth/callback" # フロントにある受け口
    "#{base}#{path}?token=#{CGI.escape(token)}"
  end
end
