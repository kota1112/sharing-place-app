# config/routes.rb
Rails.application.routes.draw do
  # ===== Health check =====
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

      devise_scope :user do
        # 現在ログイン中ユーザー情報（JWT必須）
        get 'me', to: 'users/sessions#me'
      end

      # Google の「id_token 直投げ」方式（OAuthController#google）
      # POST /auth/google  { id_token: "..." }
      post 'google', to: 'oauth#google'
    end

    # --- Places ---
    # Public: index/show/suggest
    # Private: create/update/destroy/mine/suggest_mine/restore/hard_delete/delete_photo
    resources :places, only: %i[index show create update destroy] do
      collection do
        get :mine
        get :suggest
        get :suggest_mine
      end

      member do
        # ソフト削除の復元（オーナー/管理者）
        post   :restore
        # 完全削除（管理者のみ）
        delete :hard_delete

        # 写真の単体削除（URL / ID 指定に対応、body: { url: "..." } or { photo_id: "123" }）
        post   :delete_photo
      end

      # 写真の単体削除（ID指定のRESTルート）
      # DELETE /places/:id/photos/:photo_id
      delete 'photos/:photo_id', to: 'places#destroy_photo'
    end
  end
end
