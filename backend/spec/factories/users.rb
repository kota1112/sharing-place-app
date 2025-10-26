FactoryBot.define do
    factory :user do
      email { Faker::Internet.unique.email }
      password { "password123" }
      display_name { Faker::Name.name }
      username { Faker::Internet.username }
      role { "user" }
    end
  end
  