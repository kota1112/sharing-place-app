FactoryBot.define do
    factory :place do
      name { "Sample Place" }
      city { "Tokyo" }
      association :author, factory: :user
    end
  end
  