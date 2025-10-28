# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
# db/seeds.rb

# db/seeds.rb

# --- 1) ユーザー作成（共通） ---
user = User.find_or_create_by!(email: "demo@example.com") do |u|
  u.password = "password"
  u.password_confirmation = "password"
  u.name = "Demo User" if u.respond_to?(:name)
end

# --- 2) 固定のPlace（写真なし） ---
places = [
  { name: "Moonhouse", description: "メルボルンの人気レストラン。",
    address_line: "288 Swan St", city: "Melbourne", state: "VIC",
    postal_code: "3121", country: "AU", latitude: -37.824, longitude: 144.997 },
  { name: "Tokyo Station", description: "東京駅のサンプルスポット",
    address_line: "1-9-1 Marunouchi", city: "Chiyoda", state: "Tokyo",
    postal_code: "100-0005", country: "JP", latitude: 35.681236, longitude: 139.767125 }
]

places.each do |attrs|
  p = Place.find_or_initialize_by(name: attrs[:name])
  p.assign_attributes(attrs.merge(author_id: user.id))
  p.save!  # 写真は添付しない
end

# --- 3) Fakerで量産（任意） ---
# 環境変数 FAKER_COUNT=0 でスキップできるように
count = (ENV["FAKER_COUNT"] || "50").to_i
if count > 0
  require "faker"
  Faker::Config.locale = "ja"

  def rand_tokyo(lat: 35.681236, lng: 139.767125, delta: 0.25)
    [lat + (rand * 2 - 1) * delta, lng + (rand * 2 - 1) * delta]
  end

  ActiveRecord::Base.transaction do
    count.times do
      lat, lng = rand_tokyo
      Place.create!(
        name:        Faker::Restaurant.unique.name,
        description: Faker::Lorem.paragraph(sentence_count: 3),
        address_line: Faker::Address.street_address,
        city:        Faker::Address.city,
        state:       Faker::Address.state_abbr,
        postal_code: Faker::Address.postcode,
        country:     "JP",
        latitude:    lat,
        longitude:   lng,
        author_id:   user.id
      )
    end
  end
end

puts "Seed done: users=#{User.count}, places=#{Place.count}"
