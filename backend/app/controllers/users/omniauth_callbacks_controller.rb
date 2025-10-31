class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  skip_before_action :verify_authenticity_token

  def google_oauth2
    auth = request.env['omniauth.auth'] # nil なら設定/URIミスマッチ
    return render json: { error: 'No auth info' }, status: :unprocessable_entity if auth.nil?

    user = User.find_by(email: auth.info.email.downcase)

    unless user
      user = User.new(
        email: auth.info.email,
        password: Devise.friendly_token.first(20),
        display_name: auth.info.name
      )
      user.save!
    end

    identity = SocialIdentity.find_or_initialize_by(
      provider: auth.provider, provider_uid: auth.uid
    )
    identity.user = user
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
    Rails.logger.error("[google_oauth2] #{e.class}: #{e.message}\n#{e.backtrace&.first(3)&.join("\n")}")
    render json: { error: 'OAuth failed' }, status: :internal_server_error
  end

  private

  # フロントへ戻す先（SignUp.jsx/LogIn.jsx と合わせる）
  def after_oauth_redirect_url(token)
    base = ENV.fetch('FRONTEND_ORIGIN', 'http://localhost:5173')
    path = '/oauth/callback' # フロントに用意した受け口
    "#{base}#{path}?token=#{CGI.escape(token)}"
  end
end
