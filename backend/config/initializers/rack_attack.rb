# config/initializers/rack_attack.rb

# ここでクラスを開くことで Rails 起動時に一度だけ設定される
class Rack::Attack
  # ===============================
  # 1. 認証まわりのレート制限
  # ===============================

  # 1IPあたり /auth/sign_in を1分で30回まで
  throttle("logins/ip", limit: 30, period: 60.seconds) do |req|
    if req.post? && req.path.start_with?("/auth/sign_in")
      req.ip
    end
  end

  # 1IPあたり Google系のエンドポイントを1分で30回まで
  # あなたのアプリには
  #   - /auth/google        (自前APIでGoogleを叩く)
  #   - /auth/google_oauth2 (devise-omniauthの典型)
  # の両方があり得るので両方をまとめて見る
  throttle("logins_google/ip", limit: 30, period: 60.seconds) do |req|
    if req.post? &&
       (req.path.start_with?("/auth/google") ||
        req.path.start_with?("/auth/google_oauth2"))
      req.ip
    end
  end

  # ソーシャルの紐付けAPIも1分で30回まで
  throttle("link_google/ip", limit: 30, period: 60.seconds) do |req|
    if req.path.start_with?("/auth/link/google")
      req.ip
    end
  end

  # ===============================
  # 2. 429レスポンスの共通化
  # ===============================
  # Rack::Attack 6系の新しいやり方
  self.throttled_responder = lambda do |_req|
    [
      429,
      { "Content-Type" => "application/json" },
      [{ error: "Too many requests" }.to_json]
    ]
  end

  # 古いバージョン互換（あっても害はない）
  self.throttled_response = lambda do |_env|
    [
      429,
      { "Content-Type" => "application/json" },
      [{ error: "Too many requests" }.to_json]
    ]
  end
end
