# app/controllers/oauth_controller.rb
class OauthController < ApplicationController
  include Devise::Controllers::Helpers
  # APIモードのため CSRF は不要。以下2行は削除/非使用
  # protect_from_forgery with: :null_session
  # skip_before_action :verify_authenticity_token

  respond_to :json

  # POST /auth/google { id_token: "..." }
  def google
    id_token = params[:id_token].to_s
    return render json: { error: "id_token missing" }, status: :bad_request if id_token.blank?

    payload = verify_google_id_token(id_token)
    return render json: { error: "invalid id_token" }, status: :unauthorized if payload.nil?

    sub     = payload["sub"]
    email   = payload["email"]&.downcase
    name    = payload["name"]
    picture = payload["picture"]

    ActiveRecord::Base.transaction do
      identity = SocialIdentity.find_by(provider: "google", provider_uid: sub)
      user =
        if identity
          identity.user
        else
          u = User.find_by(email: email) || User.create!(
            email: email,
            password: SecureRandom.base58(20),
            display_name: name,
            avatar_url: picture
          )
          u.social_identities.create!(provider: "google", provider_uid: sub, raw_info: payload)
          u
        end

      # devise-jwt を手動発行
      encoder = Warden::JWTAuth::UserEncoder.new
      token, _ = encoder.call(user, :user, nil)
      response.set_header('Authorization', "Bearer #{token}")

      render json: {
        token: token,
        user: {
          id: user.id, email: user.email,
          display_name: user.display_name, username: user.username,
          avatar_url: user.avatar_url
        }
      }, status: :ok
    end
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
  rescue => e
    Rails.logger.error("[OAuth#google] #{e.class} #{e.message}")
    render json: { error: "server_error" }, status: :internal_server_error
  end

  private

  def verify_google_id_token(id_token)
    client_id = ENV["GOOGLE_CLIENT_ID"]
    raise "Missing GOOGLE_CLIENT_ID" if client_id.blank?

    validator = GoogleIDToken::Validator.new
    payload = validator.check(id_token, client_id, client_id)
    return nil unless payload && payload["aud"] == client_id
    return nil if payload["exp"].to_i <= Time.now.to_i
    payload
  rescue GoogleIDToken::ValidationError
    nil
  end
end
