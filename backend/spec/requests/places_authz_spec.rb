# spec/requests/places_authz_spec.rb
require 'rails_helper'
require 'devise/jwt/test_helpers'

RSpec.describe 'Places authz', type: :request do
  let(:owner) { create(:user) }
  let(:other) { create(:user) }
  let(:place) { create(:place, author: owner, name: 'Authz') }

  def headers(u)
    Devise::JWT::TestHelpers.auth_headers({ 'Accept' => 'application/json' }, u)
  end

  it 'forbids non-owner updating' do
    patch "/places/#{place.id}",
      params: { place: { description: 'hack' } },
      headers: headers(other)
    expect(response).to have_http_status(:forbidden)
  end

  it 'allows owner updating' do
    patch "/places/#{place.id}",
      params: { place: { description: 'ok' } },
      headers: headers(owner)
    expect(response).to have_http_status(:ok)
  end

  it 'forbids non-owner deletion' do
    delete "/places/#{place.id}", headers: headers(other)
    expect(response).to have_http_status(:forbidden)
  end

  it 'allows owner deletion' do
    delete "/places/#{place.id}", headers: headers(owner)
    expect(response).to have_http_status(:no_content)
  end
end