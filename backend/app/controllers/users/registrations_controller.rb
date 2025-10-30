# app/controllers/users/registrations_controller.rb
class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :json
  # 更新・退会は必ずJWTでログインしていること
  before_action :authenticate_user!, only: %i[update destroy]

  # POST /auth
  # サインアップ（これまで通り）
  # 成功してもここではJWTは返さない想定（フロントで直後に /auth/sign_in している）
  def create
    build_resource(sign_up_params)

    if resource.save
      render json: {
        user: {
          id: resource.id,
          email: resource.email,
          display_name: resource.display_name,
          username: resource.username
        }
      }, status: :created
    else
      render json: { errors: resource.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /auth
  # アカウント更新（メール・表示名だけなら current_password 不要、
  # パスワードを変えるときだけ current_password を必須にする）
  #
  # 期待するリクエストボディ:
  # {
  #   "user": {
  #     "email": "new@example.com",
  #     "display_name": "New name",
  #     "username": "new_username",
  #     "current_password": "oldpass",   ← passwordを変えるときだけ必要
  #     "password": "newpass",
  #     "password_confirmation": "newpass"
  #   }
  # }
  def update
    user = current_user
    return render json: { errors: ["unauthorized"] }, status: :unauthorized unless user

    permitted = account_update_params

    wants_password_change = permitted[:password].present? || permitted[:password_confirmation].present?

    if wants_password_change
      if permitted[:current_password].blank?
        return render json: { errors: ["current_password is required"] }, status: :unprocessable_entity
      end

      unless user.valid_password?(permitted[:current_password])
        return render json: { errors: ["current_password is invalid"] }, status: :unprocessable_entity
      end
    end

    # DBに保存しないキーは捨てる
    permitted.delete(:current_password)

    if user.update(permitted)
      render json: { user: user_payload(user) }, status: :ok
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /auth
  # 退会API（必要ならこのまま残す）
  def destroy
    current_user&.destroy
    head :no_content
  end

  private

  # サインアップ時に許可する項目
  def sign_up_params
    params.require(:user).permit(
      :email,
      :password,
      :password_confirmation,
      :display_name,
      :username
    )
  end

  # 更新時に許可する項目
  def account_update_params
    params.require(:user).permit(
      :email,
      :display_name,
      :username,
      :current_password,
      :password,
      :password_confirmation
    )
  end

  # フロントに返す形を統一しておく
  def user_payload(user)
    {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      username: user.username,
      role: user.role,
      last_seen_at: user.try(:last_seen_at),
      # Google連携の有無を /account/connections で使えるように
      providers: user.social_identities.pluck(:provider)
    }
  end
end
