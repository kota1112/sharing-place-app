# frozen_string_literal: true

Rails.application.config.x.geocoding = ActiveSupport::OrderedOptions.new
Rails.application.config.x.geocoding.max_cache_age = 30.days # 規約配慮：再利用は 30日以内
Rails.application.config.x.geocoding.provider_name = 'google'
Rails.application.config.x.geocoding.terms_version = 'google-maps-platform-2024-xx' # 内部メモ用