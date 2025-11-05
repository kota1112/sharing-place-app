# config/environments/production.rb
require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Cache assets for far-future expiry since they are all digest stamped.
  config.public_file_server.headers = {
    "cache-control" => "public, max-age=#{1.year.to_i}"
  }

  # ===== Active Storage =====
  # 本番では S3 を使う想定。ENV が無ければローカルにフォールバック。
  config.active_storage.service =
    (ENV["ACTIVE_STORAGE_SERVICE"].presence || "local").to_sym

  # 署名付きURLの有効期限（デフォルト15分）
  config.active_storage.service_urls_expire_in = 15.minutes

  # HTTPS 前提（RenderなどのリバースプロキシでTLS終端）
  config.assume_ssl = true
  config.force_ssl  = true
  # config.ssl_options = { redirect: { exclude: ->(r){ r.path == "/up" } } }

  # ログ
  config.log_tags = [:request_id]
  logger           = ActiveSupport::Logger.new($stdout)
  logger.formatter = ::Logger::Formatter.new
  config.logger    = ActiveSupport::TaggedLogging.new(logger)
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.silence_healthcheck_path = "/up"
  config.active_support.report_deprecations = false

  # キャッシュ / ジョブ
  config.cache_store = :solid_cache_store
  config.active_job.queue_adapter = :solid_queue
  config.solid_queue.connects_to = { database: { writing: :queue } }

  # ===== Mailer / URL 既定ホスト =====
  # Render では RENDER_EXTERNAL_HOSTNAME が与えられる
  render_host = ENV["RENDER_EXTERNAL_HOSTNAME"].presence
  # APP_HOST があれば最優先。無ければ Render の実ホスト、それも無ければ固定の onrender ドメイン。
  app_host = ENV["APP_HOST"].presence || render_host || "sharing-place-api.onrender.com"

  config.action_mailer.default_url_options      = { host: app_host, protocol: "https" }
  config.action_controller.default_url_options  = { host: app_host, protocol: "https" }

  if ENV["SMTP_ADDRESS"].present?
    config.action_mailer.perform_caching = false
    config.action_mailer.delivery_method = :smtp
    config.action_mailer.smtp_settings = {
      address:              ENV["SMTP_ADDRESS"],
      port:                 (ENV["SMTP_PORT"] || 587).to_i,
      domain:               ENV["SMTP_DOMAIN"] || app_host,
      user_name:            ENV["SMTP_USERNAME"],
      password:             ENV["SMTP_PASSWORD"],
      authentication:       (ENV["SMTP_AUTH"] || "plain").to_sym,
      enable_starttls_auto: ENV.fetch("SMTP_TLS", "true") == "true"
    }
  end

  # I18n
  config.i18n.fallbacks = true

  # DB
  config.active_record.dump_schema_after_migration = false
  config.active_record.attributes_for_inspect = [:id]

  # ===== Host ヘッダの保護（Allowlist）=====
  allowed_hosts = []

  # 既定ホスト（APP_HOST または Render 実ホスト）を許可
  allowed_hosts << app_host if app_host.present?

  # Render で自動付与されるホスト名があれば明示許可
  allowed_hosts << render_host if render_host.present?

  # 複数ホスト：APP_HOSTS="a.com,b.com"
  if ENV["APP_HOSTS"].present?
    allowed_hosts.concat ENV["APP_HOSTS"].split(",").map(&:strip)
  end

  # 将来別サービス/プレビューの onrender ドメインでも動くようにワイルドカードを追加
  config.hosts << /\A.*\.onrender\.com\z/

  # 明示ホストを登録
  allowed_hosts.uniq.each { |h| config.hosts << h }

  # /up は HostAuthorization をスキップ（ヘルスチェック用）
  config.host_authorization = { exclude: ->(request) { request.path == "/up" } }
end
