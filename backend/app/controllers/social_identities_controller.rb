# app/controllers/social_identities_controller.rb
class SocialIdentitiesController < ApplicationController
  include Devise::Controllers::Helpers
  before_action :authenticate_user!
  respond_to :json

  # POST /auth/link/google  { id_token: "..." }
  def link_google
    id_token = params[:id_token].to_s
    return render json: { error: 'id_token missing' }, status: :bad_request if id_token.blank?

    payload = verify_google_id_token(id_token)
    return render json: { error: 'invalid id_token' }, status: :unauthorized if payload.nil?

    sub   = payload['sub']                    # Google user id
    email = payload['email']&.downcase

    # すでに他ユーザーに同じ Google アカウントが紐づいていないかを確認
    taken = SocialIdentity.find_by(provider: 'google', provider_uid: sub)
    if taken && taken.user_id != current_user.id
      return render json: { error: 'already_linked_to_another_account' }, status: :conflict
    end

    identity = current_user.social_identities.find_or_initialize_by(provider: 'google')
    identity.provider_uid = sub
    identity.raw_info     = payload
    identity.save!

    render json: {
      linked: true,
      provider: 'google',
      user: { id: current_user.id, email: current_user.email }
    }, status: :ok
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
  rescue => e
    Rails.logger.error("[SocialIdentities#link_google] #{e.class} #{e.message}")
    render json: { error: 'server_error' }, status: :internal_server_error
  end

  # DELETE /auth/link/google
  def unlink_google
    identity = current_user.social_identities.find_by(provider: 'google')
    return render json: { error: 'not_linked' }, status: :not_found unless identity

    if cannot_unlink_last_method?(current_user, identity)
      return render json: { error: 'cannot_unlink_last_login_method' }, status: :unprocessable_entity
    end

    identity.destroy!
    render json: { linked: false, provider: 'google' }, status: :ok
  end

  private

  # 「他のログイン手段が無いのに解除しようとしていないか」を防止
  def cannot_unlink_last_method?(user, identity_to_remove)
    other_identities_exist = user.social_identities.where.not(id: identity_to_remove.id).exists?
    has_password = user.encrypted_password.present?
    !(other_identities_exist || has_password)
  end

  # OauthController と同等の ID Token 検証（DRY化したければ module 化も可）
  def verify_google_id_token(id_token)
    client_id = ENV['GOOGLE_CLIENT_ID']
    raise 'Missing GOOGLE_CLIENT_ID' if client_id.blank?

    validator = GoogleIDToken::Validator.new
    payload   = validator.check(id_token, client_id, client_id)
    return nil unless payload && payload['aud'] == client_id
    return nil if payload['exp'].to_i <= Time.now.to_i
    payload
  rescue GoogleIDToken::ValidationError
    nil
  end
end
