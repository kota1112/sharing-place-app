# spec/support/jwt_helpers.rb
module JwtHelpers
    # 認証ヘッダを発行する（devise-jwt 併用）
    def auth_header_for(user, headers = {})
      # Devise::JWT::TestHelpers を利用
      require 'devise/jwt/test_helpers'
      Devise::JWT::TestHelpers.auth_headers(headers, user)
    end
  end
  
  RSpec.configure do |config|
    config.include JwtHelpers, type: :request
  end
  