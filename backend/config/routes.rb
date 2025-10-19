# config/routes.rb
Rails.application.routes.draw do
  # 認証系（JSON専用コントローラへ接続）
  scope :auth do
    devise_for :users,
      path: '',
      defaults: { format: :json },
      controllers: {
        sessions: 'users/sessions',
        registrations: 'users/registrations'
      }

    # 追加: 現在ユーザー取得（JWT 必須）
    devise_scope :user do
      get 'me', to: 'users/sessions#me', defaults: { format: :json }
    end
  end

  # Places CRUD（常にJSONを返すなら defaults を付けておくと安全）
  resources :places, defaults: { format: :json }

  # 既存の /me は混乱しやすいので基本は削除推奨（下行は削除）
  # get 'me', to: 'profiles#me'

  # ヘルスチェック（任意）
  get 'up' => 'rails/health#show', as: :rails_health_check
end
