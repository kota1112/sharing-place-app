SecureHeaders::Configuration.default do |config|
  # iframe禁止（クリックジャッキング対策）
  config.x_frame_options = "DENY"

  # XSS対策
  config.x_xss_protection = "1; mode=block"

  # MIME sniffing防止
  config.x_content_type_options = "nosniff"

  # 基本のCSP
  config.csp = {
    default_src: %w['self'],
    script_src:  %w['self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com],
    img_src:     %w['self' data: https:],
    style_src:   %w['self' 'unsafe-inline'],
    connect_src: %w['self' https://accounts.google.com],
    frame_ancestors: %w['self'],
  }
end
