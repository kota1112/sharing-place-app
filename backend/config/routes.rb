# config/routes.rb
Rails.application.routes.draw do
  # ===== Health check (for uptime monitors) =====
  get 'up', to: 'rails/health#show', as: :rails_health_check

  # ===== API (JSON only) =====
  scope defaults: { format: :json } do
    # --- Auth (Devise + JWT) ---
    scope :auth do
      devise_for :users,
        path: '',
        defaults: { format: :json },
        controllers: {
          sessions: 'users/sessions',
          registrations: 'users/registrations'
        }

      # Current user (requires JWT)
      devise_scope :user do
        get 'me', to: 'users/sessions#me'
      end
    end

    # --- Places ---
    # Public: index/show
    # Private: create/update/destroy/mine (controller側で authenticate_user!)
    resources :places, only: [:index, :show, :create, :update, :destroy] do
      collection do
        get :mine   # => PlacesController#mine
      end
    end
  end
end
