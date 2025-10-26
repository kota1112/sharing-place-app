# spec/requests/places_photos_spec.rb
require "rails_helper"
require "devise/jwt/test_helpers"

RSpec.describe "Places photos", type: :request do
  let(:user) { create(:user, password: "password") }

  def auth_headers(extra = {})
    base = { "Accept" => "application/json" }.merge(extra)
    Devise::JWT::TestHelpers.auth_headers(base, user)
  end

  it "returns first_photo_url in index when photos are attached" do
    place = create(:place, author: user, name: "With Pic")

    # ← フィクスチャ不要。ダミー画像を生成
    file = dummy_image_file # または dummy_image_file(filename: 'x.png', content_type: 'image/png')

    patch "/places/#{place.id}",
      params: { place: { description: "add photo" }, photos: [file] },
      headers: auth_headers("Content-Type" => "multipart/form-data")

    expect(response).to have_http_status(:ok)

    get "/places"
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    item = body.find { |x| x["id"] == place.id }
    expect(item["first_photo_url"]).to be_present
  end
end