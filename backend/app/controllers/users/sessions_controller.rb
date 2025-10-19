# app/controllers/users/sessions_controller.rb
class Users::SessionsController < Devise::SessionsController
  respond_to :json

  # Devise 標準だと session に保存しようとするので store:false を明示
  def create
    self.resource = warden.authenticate!(auth_options)
    sign_in(resource_name, resource, store: false) # ← ここがポイント
    # 以降、warden-jwt_auth が JWT を Authorization ヘッダに自動で付与
    render json: { user: { id: resource.id, email: resource.email, display_name: resource.display_name } }, status: :ok
  end

  private

  def respond_to_on_destroy
    head :no_content
  end
end
