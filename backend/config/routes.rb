# config/routes.rb
Rails.application.routes.draw do
  # ===== 認証（Devise + JWT）: すべて JSON 想定 =====
  scope :auth do
    devise_for :users,
      path: '',
      defaults: { format: :json },
      controllers: {
        sessions: 'users/sessions',
        registrations: 'users/registrations'
      }

    # 現在のユーザー情報（JWT 必須）
    devise_scope :user do
      get 'me', to: 'users/sessions#me', defaults: { format: :json }
    end
  end

  # ===== Places =====
  # 常に JSON を返す。自分の Place 一覧は /places/mine
  resources :places, defaults: { format: :json } do
    collection do
      get :mine  # => PlacesController#mine（要: authenticate_user!）
    end
  end

  # （旧）/me は混乱防止のため削除推奨
  # get 'me', to: 'profiles#me'

  # ヘルスチェック
  get 'up' => 'rails/health#show', as: :rails_health_check
end
