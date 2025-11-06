# app/controllers/users/sessions_controller.rb
class Users::SessionsController < Devise::SessionsController
  respond_to :json

  # ルートは {:format=>:json} だが、拡張子なしでも確実に JSON として処理
  before_action :force_json_format

  # API用: サインイン/アウトではCSRFを無効化（存在しなくてもraiseしない）
  skip_before_action :verify_authenticity_token, only: [:create, :destroy], raise: false

  # /auth/me は JWT 必須
  before_action :authenticate_user!, only: [:me]

  # デバッグ時のみ例外をヘッダに露出（500にしない）
  around_action :wrap_exceptions_for_debug, only: [:create]

  # POST /auth/sign_in
  #
  # 契約は維持:
  # - 入力: {user:{email,password}} / {email,password} 両対応
  # - 出力: { user: ... }
  # - JWT: レスポンスヘッダ Authorization: Bearer <token>
  #
  # 安定化:
  # - devise-jwt の自動ディスパッチは使わず、手動でJWT発行
  # - APIモードで例外になりがちなセッション保存は行わない（store: false）
  def create
    Rails.logger.info("[sign_in] ENTER create action. content_type=#{request.content_type} accept=#{request.headers['Accept']}")
    Rails.logger.info("[sign_in] raw_body=#{request.raw_post.to_s.bytesize}B")
    
    email, password = extract_credentials
    unless email.present? && password.present?
      return render json: { error: "Invalid credentials" }, status: :unauthorized
    end

    user = User.find_for_database_authentication(email: email)
    unless user&.valid_password?(password)
      return render json: { error: "Invalid credentials" }, status: :unauthorized
    end

    # devise-jwt の自動ディスパッチはスキップ（手動発行に任せる）
    request.env['warden-jwt_auth.skip'] = true

    # current_user を使えるようにするが、セッションは保存しない
    sign_in(:user, user, store: false)

    # JWT を手動発行 → レスポンスヘッダ
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    response.set_header('Authorization', "Bearer #{token}")
    response.set_header('Access-Control-Expose-Headers', 'Authorization')

    render json: { user: user_payload(user) }, status: :ok
  end

  # DELETE /auth/sign_out
  # JWT の revoke（Null 戦略なので実質 no-op）。常に 204
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

  def force_json_format
    request.format = :json
  end

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

  # create まわりの例外を 500 にせず捕捉し、401 で返す
  # DEBUG_AUTH_ERRORS=true のときだけヘッダで例外名/メッセージを露出
  def wrap_exceptions_for_debug
    yield
  rescue => e
    Rails.logger.error("[sign_in] #{e.class}: #{e.message}\n#{Array(e.backtrace).first(10).join("\n")}")
    if ENV["DEBUG_AUTH_ERRORS"] == "true"
      response.set_header('X-Debug-Error', e.class.to_s)
      response.set_header('X-Debug-Message', e.message.to_s[0, 200])
    end
    render json: { error: "Sign in failed" }, status: :unauthorized
  end

  protected

  # Devise デフォルトの「既にサインアウトしています」フラッシュを止める
  def verify_signed_out_user
    # 何もしない -> 常に 204
  end

  # JSON 用のサインアウトレスポンス
  def respond_to_on_destroy
    head :no_content
  end

  # 念のためHTMLリダイレクトはさせない
  def auth_options
    { scope: resource_name, recall: "#{controller_path}#new" }
  end
end
