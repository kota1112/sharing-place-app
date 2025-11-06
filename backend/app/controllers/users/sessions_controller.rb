# app/controllers/users/sessions_controller.rb
class Users::SessionsController < Devise::SessionsController
  respond_to :json

  # API用: サインイン/アウトではCSRFを無効化（本番でもraiseしない）
  skip_before_action :verify_authenticity_token, only: [:create, :destroy], raise: false

  # /auth/me は JWT 必須
  before_action :authenticate_user!, only: [:me]

  # POST /auth/sign_in
  # 成功時は devise-jwt が Authorization: Bearer <token> を自動で付ける
  def create
    # どちらの形でも受ける: {user: {email, password}} / {email, password}
    email    = params.dig(:user, :email)    || params[:email]
    password = params.dig(:user, :password) || params[:password]

    unless email.present? && password.present?
      return render json: { error: "Invalid credentials" }, status: :unauthorized
    end

    # Deviseの認証フローに合わせてDBから取得→パスワード検証
    user = User.find_for_database_authentication(email: email)
    unless user&.valid_password?(password)
      return render json: { error: "Invalid credentials" }, status: :unauthorized
    end

    # devise-jwt を動かすため sign_in を必ず通す
    sign_in(:user, user)

    render json: { user: user_payload(user) }, status: :ok
  rescue => e
    # どんな例外でも 500 を外へ出さず、ログだけ残して 401 を返す
    Rails.logger.error("[sign_in] #{e.class}: #{e.message}\n#{Array(e.backtrace).first(5).join("\n")}")
    render json: { error: "Sign in failed" }, status: :unauthorized
  end

  # DELETE /auth/sign_out
  # JWT の revoke。常に 204 を返す
  def destroy
    sign_out(resource_name) if current_user
    head :no_content
  end

  # GET /auth/me
  # 現在ログイン中ユーザーを返す
  #
  # 例:
  # {
  #   "user": {
  #     "id": 7,
  #     "email": "xxx@example.com",
  #     "display_name": "Foo",
  #     "username": null,
  #     "avatar_url": "https://...",
  #     "providers": ["google"]
  #   }
  # }
  def me
    render json: { user: user_payload(current_user) }, status: :ok
  end

  private

  # フロントに返す共通の形（既存実装を保持）
  def user_payload(user)
    return nil unless user

    providers =
      if user.respond_to?(:social_identities)
        user.social_identities.pluck(:provider)
      else
        []
      end

    {
      id: user.id,
      email: user.email,
      display_name: user.try(:display_name),
      username: user.try(:username),
      avatar_url: user.try(:avatar_url),
      providers: providers
    }
  end

  protected

  # Devise デフォルトの「既にサインアウトしています」フラッシュを止める
  def verify_signed_out_user
    # 何もしない -> 常に 204 にする
  end

  # JSON 用のサインアウトレスポンス
  def respond_to_on_destroy
    head :no_content
  end

  # HTML にリダイレクトしないように
  def auth_options
    { scope: resource_name, recall: "#{controller_path}#new" }
  end
end
