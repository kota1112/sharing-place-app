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
                   # ※ 今は OmniAuth のコールバックコントローラは使わない
                 }

      devise_scope :user do
        # JWTで認証済みの現在ユーザーを返す
        get "me", to: "users/sessions#me"
      end

      # フロントが取得した Google ID Token を直で投げるパターン
      # POST /auth/google  { id_token: "..." }
      post "google", to: "oauth#google"

      # ==== 後からGoogleを紐付け/解除するAPI ====
      # POST   /auth/link/google   { id_token: "..." }  ← 既存ユーザーにGoogleを追加でひも付ける
      # DELETE /auth/link/google                       ← ひも付けたGoogleを外す
      post   "link/google", to: "social_identities#link_google"
      delete "link/google", to: "social_identities#unlink_google"

      # ==== Google連携ユーザー向けパスワード再発行 ====
      # POST /auth/password/forgot_via_google { email: "xxx@gmail.com" }
      # - 指定メールのユーザーが存在し
      # - かつそのユーザーが provider: "google" を持っているときだけ
      #   Devise の reset password メールを送る
      post "password/forgot_via_google", to: "passwords#forgot_via_google"
    end

    # --- Places ---
    resources :places, only: %i[index show create update destroy] do
      collection do
        get :mine
        get :suggest
        get :suggest_mine
      end

      member do
        # ソフト削除の復元
        post   :restore
        # 完全削除
        delete :hard_delete
        # URL/IDを投げて写真を消す
        post   :delete_photo
      end

      # 写真をIDで消すRESTっぽいルート
      delete "photos/:photo_id", to: "places#destroy_photo"
    end
  end
end
