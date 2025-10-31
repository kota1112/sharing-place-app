# app/controllers/passwords_controller.rb
class PasswordsController < ApplicationController
  # 誰でも叩けるので authenticate_user! はしない
  respond_to :json

  # POST /auth/password/forgot_via_google
  # body: { email: "xxxx@gmail.com" }
  def forgot_via_google
    email = params[:email].to_s.downcase.strip
    return render json: { error: "email missing" }, status: :bad_request if email.blank?

    user = User.find_by(email: email)
    return render json: { error: "not_found" }, status: :not_found unless user

    # 👇 ここがポイント：Googleと連携してるかどうか
    if user.social_identities.exists?(provider: "google")
      # Devise が持ってるパスワードリセットメールを発行する
      user.send_reset_password_instructions
      render json: { sent: true }, status: :ok
    else
      # Google連携してないなら弾く
      render json: { error: "google_not_linked" }, status: :unprocessable_entity
    end
  end
end
