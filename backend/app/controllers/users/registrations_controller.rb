# app/controllers/users/registrations_controller.rb
class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :json
  before_action :authenticate_user!, only: %i[update destroy]

  # POST /auth  サインアップ（セッションに触れない）
  def create
    build_resource(sign_up_params)
    if resource.save
      render json: { user: { id: resource.id, email: resource.email } }, status: :created
    else
      render json: { errors: resource.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /auth  アカウント更新（API向け・セッション非依存）
  def update
    if resource.update_with_password(account_update_params)
      # セッションに触れない（bypass_sign_inしない）
      render json: {
        user: resource.slice(:id, :email, :display_name, :username, :role, :last_seen_at)
      }, status: :ok
    else
      render json: { errors: resource.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /auth  退会（API向け・セッション非依存）
  def destroy
    resource.destroy
    head :no_content
  end

  private

  def sign_up_params
    params.require(:user).permit(:email, :password, :password_confirmation, :display_name, :username)
  end

  def account_update_params
    params.require(:user).permit(
      :email, :password, :password_confirmation, :current_password, :display_name, :username
    )
  end
end
