class Users::SessionsController < Devise::SessionsController
    respond_to :json
    private
    def respond_with(resource, _opts = {})
      render json: { user: { id: resource.id, email: resource.email, display_name: resource.display_name } }, status: :ok
    end
    def respond_to_on_destroy; head :no_content; end
  end
  