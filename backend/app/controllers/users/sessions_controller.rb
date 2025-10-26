# app/controllers/users/sessions_controller.rb
class Users::SessionsController < Devise::SessionsController
  respond_to :json
  # /auth/me 用（JWT 必須）
  before_action :authenticate_user!, only: [:me]

  # POST /auth/sign_in
  # 成功時は JWT がレスポンスヘッダ Authorization に付与されます（devise-jwt が自動付与）
  def create
    # 認証（メール＋パスワード）
    self.resource = warden.authenticate!(auth_options)
    # JWT 発行のため sign_in を呼びます（セッションストアは使わず、devise-jwt がトークンを付与）
    sign_in(resource_name, resource)

    render json: { user: user_payload(resource) }, status: :ok
  end

  # DELETE /auth/sign_out
  # JWT を無効化（revocation）。ボディは返さず 204。
  def destroy
    # 既にサインアウト済みでも 204 を返すようにする
    sign_out(resource_name) if current_user
    head :no_content
  end

  # GET /auth/me
  # 現在のログインユーザー情報を返す（Authorization: Bearer <JWT> 必須）
  def me
    render json: { user: user_payload(current_user) }, status: :ok
  end

  private

  # クライアントに返すユーザーの最小限ペイロード
  def user_payload(user)
    return nil unless user
    {
      id: user.id,
      email: user.email,
      display_name: user.try(:display_name),
      username: user.try(:username)
    }
  end

  protected

  # Devise デフォルトの「サインアウト済みエラー」を抑止して常に 204 を返す
  def verify_signed_out_user
    # 何もしない
  end

  # Devise の destroy 応答を JSON 向けに（204 No Content）
  def respond_to_on_destroy
    head :no_content
  end

  # 失敗時に HTML へフォールバックせず JSON レスポンスにするための auth_options
  def auth_options
    { scope: resource_name, recall: "#{controller_path}#new" }
  end
end
