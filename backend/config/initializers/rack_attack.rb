# config/initializers/rack_attack.rb

# === TEMP: use MemoryStore in prod until Solid tables exist ===
# 環境変数 RACK_ATTACK_USE_MEMORY_STORE=true のときだけ、
# Rack::Attack のキャッシュをメモリストアに切り替えて DB（Solid Cache）を触らないようにする。
# 既存のロジックはそのまま・条件付きでの上書きのみ。
if ENV["RACK_ATTACK_USE_MEMORY_STORE"] == "true"
  Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
end

# 起動時に一度だけ設定されるようにクラスを開く
class Rack::Attack
  # ===============================
  # 1. 認証まわりのレート制限
  # ===============================

  # 1 IP あたり /auth/sign_in を 1分で30回まで
  throttle("logins/ip", limit: 30, period: 60.seconds) do |req|
    if req.post? && req.path.start_with?("/auth/sign_in")
      req.ip
    end
  end

  # 1 IP あたり Google系のエンドポイントを 1分で30回まで
  # - /auth/google        ← GISからの直投げ
  # - /auth/google_oauth2 ← Devise/OmniAuthを有効にしたとき用
  throttle("logins_google/ip", limit: 30, period: 60.seconds) do |req|
    if req.post? &&
       (req.path.start_with?("/auth/google") ||
        req.path.start_with?("/auth/google_oauth2"))
      req.ip
    end
  end

  # ソーシャルの紐付けAPIも 1分で30回まで
  throttle("link_google/ip", limit: 30, period: 60.seconds) do |req|
    if req.path.start_with?("/auth/link/google")
      req.ip
    end
  end

  # ===============================
  # 2. 429レスポンスの共通化
  # ===============================
  json_429 = lambda do |_|
    [
      429,
      { "Content-Type" => "application/json" },
      [{ error: "Too many requests" }.to_json]
    ]
  end

  # 新しいRack::Attack(6.x〜)ならこっちだけ使う
  if respond_to?(:throttled_responder=)
    self.throttled_responder = json_429
  # 古いRack::Attack(5.x)しかない環境ならこっち
  elsif respond_to?(:throttled_response=)
    self.throttled_response = json_429
  end
end
