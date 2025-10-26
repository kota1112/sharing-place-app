# spec/support/request_headers.rb
module RequestHeaders
    def auth_headers(token = nil)
      headers = { 'ACCEPT' => 'application/json' }
      headers['Authorization'] = "Bearer #{token}" if token.present?
      headers
    end
  end
  
  RSpec.configure do |config|
    config.include RequestHeaders, type: :request
  end
  