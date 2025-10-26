# spec/requests/places_mine_spec.rb
require 'rails_helper'
require 'devise/jwt/test_helpers'

RSpec.describe 'Places /mine', type: :request do
  let(:user)  { create(:user) }
  let(:other) { create(:user) }

  def auth_headers(u)
    Devise::JWT::TestHelpers.auth_headers({ 'Accept' => 'application/json' }, u)
  end

  it 'requires auth' do
    get '/places/mine'
    expect(response).to have_http_status(:unauthorized)
  end

  it 'lists only my places' do
    mine   = create(:place, author: user, name: 'mine 1')
    _other = create(:place, author: other, name: 'other 1')

    get '/places/mine', headers: auth_headers(user)
    expect(response).to have_http_status(:ok)
    arr = JSON.parse(response.body)
    ids = arr.map { |h| h['id'] }
    expect(ids).to include(mine.id)
    expect(ids).not_to include(_other.id)
  end
end