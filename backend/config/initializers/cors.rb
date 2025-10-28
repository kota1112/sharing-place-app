# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

# config/initializers/cors.rb
# フロント（Viteなど）からのAPIアクセスを、開発用オリジンに限定
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # 開発フロントのオリジンだけ許可
    origins 'http://localhost:5173', 'http://127.0.0.1:5173'
    resource '*',
      headers: :any,
      expose: %w[Authorization],
      methods: %i[get post put patch delete options head],
      max_age: 3600
  end
end