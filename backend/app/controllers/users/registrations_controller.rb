# app/controllers/users/registrations_controller.rb
class Users::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  # Devise の create は sign_up → sign_in を呼ぶので、完全に上書きします
  def create
    build_resource(sign_up_params)
    resource.save
    if resource.persisted?
      render json: { user: { id: resource.id, email: resource.email } }, status: :created
    else
      render json: { errors: resource.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def sign_up_params
    params.require(:user).permit(:email, :password, :password_confirmation, :display_name, :username)
  end
end
