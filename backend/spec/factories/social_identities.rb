FactoryBot.define do
  factory :social_identity do
    user { nil }
    provider { "MyString" }
    provider_uid { "MyString" }
    access_token { "MyText" }
    refresh_token { "MyText" }
    expires_at { "2025-10-30 02:02:30" }
    raw_info { "" }
  end
end
