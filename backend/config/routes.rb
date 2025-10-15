# config/routes.rb
Rails.application.routes.draw do
  # 認証系（JSON専用コントローラへ接続）
  scope :auth do
    devise_for :users, path: '', defaults: { format: :json },
      controllers: {
        sessions: 'users/sessions',
        registrations: 'users/registrations'
      }
  end

  # Places CRUD（写真はActive Storage経由でURL返却）
  resources :places

  # ヘルスチェック（任意）
  get 'up' => 'rails/health#show', as: :rails_health_check
end
