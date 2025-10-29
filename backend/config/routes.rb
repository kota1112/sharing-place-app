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
        get 'me', to: 'users/sessions#me'
      end
    end

    # --- Places ---
    # Public: index/show/suggest
    # Private: create/update/destroy/mine/suggest_mine/restore/hard_delete
    resources :places, only: %i[index show create update destroy] do
      collection do
        get :mine
        get :suggest
        get :suggest_mine
      end
      member do
        post   :restore       # ソフト削除の復元（オーナー/管理者）
        delete :hard_delete   # 完全削除（管理者のみ）

        # 追加: 写真の単体削除（URL指定）
        # body: { url: "https://.../rails/active_storage/blobs/..." }
        post   :delete_photo
      end

      # 追加: 写真の単体削除（ID指定）
      # DELETE /places/:id/photos/:photo_id
      delete "photos/:photo_id", to: "places#destroy_photo"
    end
  end
end
