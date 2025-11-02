# config/initializers/rack_attack.rb
class Rack::Attack
  # 1 IP あたり1分に30回までログイン試行
  throttle("logins/ip", limit: 30, period: 60.seconds) do |req|
    if req.path.start_with?("/auth/sign_in") && req.post?
      req.ip
    end
  end

  # Googleログインも制限
  throttle("logins_google/ip", limit: 30, period: 60.seconds) do |req|
    # /auth/google でも /auth/google_oauth2 でも拾えるようにしておく
    if req.post? && (req.path.start_with?("/auth/google") || req.path.start_with?("/auth/google_oauth2"))
      req.ip
    end
  end

  # ソーシャル紐付けも制限（悪用防止）
  throttle("link_google/ip", limit: 30, period: 60.seconds) do |req|
    if req.path.start_with?("/auth/link/google")
      req.ip
    end
  end

  # Rack::Attack 6.0 以降は throttled_response が deprecated なので
  # CI で毎回出てた警告を消す用
  self.throttled_responder = lambda do |_req|
    [
      429,
      { "Content-Type" => "application/json" },
      [{ error: "Too many requests" }.to_json]
    ]
  end

  # 互換のために残しておいても害はない（古いバージョンでも動くように）
  self.throttled_response = lambda do |_env|
    [
      429,
      { "Content-Type" => "application/json" },
      [{ error: "Too many requests" }.to_json]
    ]
  end
end
