# spec/requests/places_spec.rb
require 'rails_helper'
require 'devise/jwt/test_helpers'  # ← これが肝

RSpec.describe "Place geocoding hooks", type: :request do
  # geocoder のスタブ（既に spec/support/geocoder_stub.rb を入れてある前提）
  include GeocoderStub

  let(:user)  { create(:user, email: "tester@example.com", password: "password") }

  # JWT 付きヘッダを作るヘルパ
  def auth_headers(extra = {})
    base = { 'Accept' => 'application/json', 'Content-Type' => 'application/json' }.merge(extra)
    Devise::JWT::TestHelpers.auth_headers(base, user)
  end

  describe "geocoding hooks" do
    it "geocodes on create when address present and coords missing" do
      stub_geocode_with(lat: 35.71, lng: 139.73)

      post "/places",
        params: {
          place: {
            name: "Shop A",
            address_line: "千代田区千代田1-1",
            city: "Tokyo"
          }
        }.to_json,
        headers: auth_headers

      expect(response).to have_http_status(:created)
      id = JSON.parse(response.body)["id"]
      place = Place.find(id)
      expect(place.latitude).to eq(35.71)
      expect(place.longitude).to eq(139.73)
    end

    it "re-geocodes when address changed" do
      # オーナー: user（403防止）
      place = create(:place, author: user, name: "X", address_line: "古い住所", city: "Tokyo")

      stub_geocode_with(lat: 34.70, lng: 135.50)

      patch "/places/#{place.id}",
        params: {
          place: {
            address_line: "大阪市北区梅田3-1-1",
            city: "Osaka"
          }
        }.to_json,
        headers: auth_headers

      expect(response).to have_http_status(:ok)
      place.reload
      expect(place.latitude).to eq(34.70)
      expect(place.longitude).to eq(135.50)
    end

    it "re-geocodes when cache expired" do
      place = create(:place,
        author: user,
        name: "Y",
        address_line: "東京都渋谷区",
        city: "Tokyo",
        latitude: 35.0,
        longitude: 139.0,
        geocoded_at: 40.days.ago, # 期限切れ扱い
        geocode_provider: "google",
        geocode_permitted: true,
        geocode_terms_version: "v1"
      )

      stub_geocode_with(lat: 35.66, lng: 139.70)

      patch "/places/#{place.id}",
        params: { place: { description: "update only" } }.to_json,
        headers: auth_headers

      expect(response).to have_http_status(:ok)
      place.reload
      expect(place.latitude).to eq(35.66)
      expect(place.longitude).to eq(139.70)
    end
  end
end