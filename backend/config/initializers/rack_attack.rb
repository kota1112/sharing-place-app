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
    if req.path.start_with?("/auth/google") && req.post?
      req.ip
    end
  end

  # ソーシャル紐付けも制限（悪用防止）
  throttle("link_google/ip", limit: 30, period: 60.seconds) do |req|
    if req.path.start_with?("/auth/link/google")
      req.ip
    end
  end

  # ブロックログ
  self.throttled_response = lambda do |env|
    [429, { "Content-Type" => "application/json" }, [{ error: "Too many requests" }.to_json]]
  end
end
