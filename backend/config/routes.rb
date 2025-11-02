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
                 controllers: begin
                   ctrls = {
                     sessions: "users/sessions",
                     registrations: "users/registrations",
                   }
                   # ← ここがポイント
                   # 環境変数 USE_OMNIAUTH_GOOGLE=true のときだけ
                   # /users/auth/google_oauth2 みたいなDeviseのルートを足す
                   if ENV["USE_OMNIAUTH_GOOGLE"] == "true"
                     ctrls[:omniauth_callbacks] = "users/omniauth_callbacks"
                   end
                   ctrls
                 end

      devise_scope :user do
        # 現在ログイン中のユーザー情報（providers もここで返す）
        get "me", to: "users/sessions#me"
      end

      # ===== GIS(フロント) → id_token を投げてログインするエンドポイント =====
      # POST /auth/google { id_token: "..." }
      post "google", to: "oauth#google"

      # ==== 後からGoogleを紐付け/解除するAPI ====
      post   "link/google", to: "social_identities#link_google"
      delete "link/google", to: "social_identities#unlink_google"

      # ==== Google連携ユーザー向けパスワード再発行（後で中身を実装する想定） ====
      post "password/forgot_via_google", to: "passwords#forgot_via_google"
    end

    # --- Places ---
    resources :places, only: %i[index show create update destroy] do
      collection do
        get :mine
        get :suggest
        get :suggest_mine

        # マップ専用の取得API（bbox / zoom / limit を受けるやつ）
        get :map
      end

      member do
        # ソフト削除の復元
        post   :restore
        # 完全削除（管理者のみ想定）
        delete :hard_delete
        # URL/ID を投げて写真を消す（既存フロントと互換）
        post   :delete_photo
      end

      # ActiveStorage の添付1件をIDで消すRESTっぽいルート
      delete "photos/:photo_id", to: "places#destroy_photo"
    end
  end
end
