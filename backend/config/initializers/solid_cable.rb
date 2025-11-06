# config/initializers/solid_cable.rb
# SolidCable の接続はフレームワーク初期化後に行う
Rails.application.config.after_initialize do
  if Rails.env.production? && defined?(SolidCable::Record)
    SolidCable::Record.connects_to database: { writing: :cable }
  end
end
