class Users::RegistrationsController < Devise::RegistrationsController
    respond_to :json
    private
    def sign_up_params
      params.require(:user).permit(:email, :password, :password_confirmation, :display_name, :username)
    end
    def respond_with(resource, _opts = {})
      if resource.persisted?
        render json: { user: { id: resource.id, email: resource.email } }, status: :created
      else
        render json: { errors: resource.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
  