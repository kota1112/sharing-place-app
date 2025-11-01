# config/routes.rb
Rails.application.routes.draw do
  # ===== Health check =====
  get "up", to: "rails/health#show", as: :rails_health_check

  # ===== API (JSON only) =====
  scope defaults: { format: :json } do
    # --- Auth (Devise + JWT) ---
    scope :auth do
      devise_for :users,
                 path: "",
                 defaults: { format: :json },
                 controllers: {
                   sessions: "users/sessions",
                   registrations: "users/registrations"
                   # OmniAuth のコールバックは使わない想定
                 }

      devise_scope :user do
        # 現在ログイン中のユーザー情報（providers もここで返す）
        get "me", to: "users/sessions#me"
      end

      # Google Identity Services で取得した id_token を投げてログインする
      # POST /auth/google { id_token: "..." }
      post "google", to: "oauth#google"

      # ==== 後からGoogleを紐付け/解除するAPI ====
      # POST   /auth/link/google    { id_token: "..." }
      # DELETE /auth/link/google
      post   "link/google", to: "social_identities#link_google"
      delete "link/google", to: "social_identities#unlink_google"

      # ==== Google連携ユーザー向けパスワード再発行（後で中身を実装する想定） ====
      # POST /auth/password/forgot_via_google { email: "..." }
      post "password/forgot_via_google", to: "passwords#forgot_via_google"
    end

    # --- Places ---
    resources :places, only: %i[index show create update destroy] do
      collection do
        get :mine
        get :suggest
        get :suggest_mine

        # マップ専用の取得API（bbox / zoom / limit を受けるやつ）
        # 例) GET /places/map?nelat=...&nelng=...&swlat=...&swlng=...&zoom=...
        get :map
      end

      member do
        # ソフト削除の復元
        post   :restore
        # 完全削除（管理者のみ）
        delete :hard_delete
        # URL/ID を投げて写真を消す（既存のフロントと互換）
        post   :delete_photo
      end

      # ActiveStorage の添付1件をIDで消すRESTっぽいルート
      delete "photos/:photo_id", to: "places#destroy_photo"
    end
  end
end
