# app/controllers/users/sessions_controller.rb
class Users::SessionsController < Devise::SessionsController
  respond_to :json

  # API用: サインイン/アウトではCSRFを無効化（存在しなくてもraiseしない）
  skip_before_action :verify_authenticity_token, only: [:create, :destroy], raise: false

  # /auth/me は JWT 必須
  before_action :authenticate_user!, only: [:me]

  # POST /auth/sign_in
  #
  # 既存の契約は維持します:
  # - リクエスト形: {user:{email,password}} / {email,password} の両対応
  # - レスポンス形: { user: ... } を返す
  # - JWT は Authorization レスポンスヘッダ（Bearer）で返す
  #
  # 変更点:
  # - devise-jwt の自動ディスパッチで落ちる環境でも 500 を出さないよう、
  #   例外は握りつぶして 401 を返す
  # - JWT は手動発行（ヘッダ付与）に統一して安定化
  def create
    email, password = extract_credentials
    unless email.present? && password.present?
      return render json: { error: "Invalid credentials" }, status: :unauthorized
    end

    user = User.find_for_database_authentication(email: email)
    unless user&.valid_password?(password)
      return render json: { error: "Invalid credentials" }, status: :unauthorized
    end

    # devise-jwt の Warden ディスパッチを明示的にスキップし、手動でトークンを発行する
    request.env['warden-jwt_auth.skip'] = true

    # Devise のセッション状態は確立しておく（current_user 用）
    sign_in(:user, user)

    # JWT を手動発行してヘッダへ
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    response.set_header('Authorization', "Bearer #{token}")
    # フロントから Authorization ヘッダを読み取れるように
    response.set_header('Access-Control-Expose-Headers', 'Authorization')

    render json: { user: user_payload(user) }, status: :ok
  rescue => e
    Rails.logger.error("[sign_in] #{e.class}: #{e.message}\n#{Array(e.backtrace).first(5).join("\n")}")
    render json: { error: "Sign in failed" }, status: :unauthorized
  end

  # DELETE /auth/sign_out
  # JWT の revoke（Null 戦略なので実質 no-op）。常に 204 を返す
  def destroy
    sign_out(resource_name) if current_user
    head :no_content
  end

  # GET /auth/me
  # 現在ログイン中ユーザーを返す（既存のフィールド構成を維持）
  def me
    render json: { user: user_payload(current_user) }, status: :ok
  end

  private

  # {user:{email,password}} / {email,password} 両対応で取り出す
  def extract_credentials
    email    = params.dig(:user, :email)    || params[:email]
    password = params.dig(:user, :password) || params[:password]
    [email, password]
  end

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
