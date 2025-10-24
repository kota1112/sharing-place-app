# spec/rails_helper.rb
require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require File.expand_path('../config/environment', __dir__)
abort("The Rails environment is running in production mode!") if Rails.env.production?

require 'rspec/rails'
# require 'capybara/rspec' # system spec を使うなら

# spec/support 配下のヘルパを自動読み込み（GeocoderStub など）
Dir[Rails.root.join('spec/support/**/*.rb')].sort.each { |f| require f }

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  puts e.to_s.strip
  exit 1
end

RSpec.configure do |config|
  # ---- RSpec 基本設定 ----
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups

  # ---- Rails/DB ----
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  # ---- FactoryBot, Devise ----
  config.include FactoryBot::Syntax::Methods
  config.include Devise::Test::IntegrationHelpers, type: :request

  # ----（任意）TimeHelpers：必要なら使えるように ----
  config.include ActiveSupport::Testing::TimeHelpers

  # ---- Active Storage の url_for 用 default host ----
  config.before(:suite) do
    host = 'http://localhost:3000'
    Rails.application.routes.default_url_options[:host] = host
    if defined?(ActiveStorage::Current)
      ActiveStorage::Current.url_options = { host: host }
    end
  end

  # ---- （任意）JSON ヘルパを作った場合のみ有効化 ----
  # config.include JsonHelpers, type: :request

  # ---- 出力/順序など（必要ならアンコメント） ----
  # if config.files_to_run.one?
  #   config.default_formatter = 'doc'
  # end
  # config.profile_examples = 10
  # config.order = :random
  # Kernel.srand config.seed
end