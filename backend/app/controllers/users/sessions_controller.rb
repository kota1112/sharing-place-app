# app/controllers/users/sessions_controller.rb
class Users::SessionsController < Devise::SessionsController
  respond_to :json

  # /auth/me は JWT 必須
  before_action :authenticate_user!, only: [:me]

  # POST /auth/sign_in
  # 成功時は devise-jwt が Authorization: Bearer <token> を自動で付ける
  def create
    # メール+パスワードで認証
    self.resource = warden.authenticate!(auth_options)
    # JWT を発行させるために sign_in を呼ぶ
    sign_in(resource_name, resource)

    render json: { user: user_payload(resource) }, status: :ok
  end

  # DELETE /auth/sign_out
  # JWT の revoke。常に 204 を返すようにしておく
  def destroy
    sign_out(resource_name) if current_user
    head :no_content
  end

  # GET /auth/me
  # 現在ログイン中ユーザーを返す
  #
  # ここで「このユーザーに今どの外部アカウントが紐づいているか」を返すことで
  # /account/connections が状態を切り替えられる
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

  # フロントに返す共通の形
  def user_payload(user)
    return nil unless user

    # social_identities が無い環境でも落ちないように safe navigation
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
