# spec/requests/auth_spec.rb
require "rails_helper"

RSpec.describe "Auth", type: :request do
  it "signs in and returns Authorization header" do
    user = create(:user, email: "a@b.c", password: "secret")
    post "/auth/sign_in",
      params: { user: { email: user.email, password: "secret" } }.to_json,
      headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:ok)
    token = response.headers["Authorization"]
    expect(token).to start_with("Bearer ")

    get "/auth/me", headers: { "Authorization" => token, "Accept" => "application/json" }
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).dig("user", "email")).to eq(user.email)
  end
end
