# spec/requests/auth_me_spec.rb
require 'rails_helper'
require 'devise/jwt/test_helpers'

RSpec.describe 'Auth /me', type: :request do
  let(:user) { create(:user, password: 'password') }

  def auth_headers(extra = {})
    base = { 'Accept' => 'application/json' }.merge(extra)
    Devise::JWT::TestHelpers.auth_headers(base, user)
  end

  it 'returns current user when authorized' do
    get '/auth/me', headers: auth_headers
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body.dig('user', 'email')).to eq(user.email)
  end

  it 'returns 401 without token' do
    get '/auth/me'
    expect(response).to have_http_status(:unauthorized)
  end
end