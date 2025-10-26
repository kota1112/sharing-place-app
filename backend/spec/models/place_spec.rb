require 'rails_helper'

RSpec.describe Place, type: :model do
  describe 'geocoding hooks' do
    it 'geocodes on create when address present and coords missing' do
      stub_geocode_with(lat: 35.71, lng: 139.71)
      place = Place.create!(name: 'X', city: 'Tokyo', address_line: 'Shinjuku')

      expect(place.latitude).to  eq(35.71)
      expect(place.longitude).to eq(139.71)
      expect(place.geocoded_at).to be_within(1.minute).of(Time.current)
    end

    it 'does not geocode if full_address is blank' do
      expect_no_geocode_call
      place = Place.create!(name: 'No Addr')
      expect(place.latitude).to be_nil
      expect(place.longitude).to be_nil
    end

    it 're-geocodes when address changed' do
      stub_geocode_with(lat: 35.0, lng: 135.0)
      place = Place.create!(name: 'X', city: 'Tokyo', address_line: 'A')

      stub_geocode_with(lat: 34.7, lng: 135.5)
      place.update!(city: 'Osaka')

      expect(place.latitude).to  eq(34.7)
      expect(place.longitude).to eq(135.5)
    end

    it 're-geocodes when cache expired' do
      stub_geocode_with(lat: 35.0, lng: 135.0)
      place = Place.create!(name: 'X', city: 'Tokyo', address_line: 'A')

      # キャッシュ期限切れを再現（30日より過去にする）
      place.update_columns(geocoded_at: 31.days.ago)

      stub_geocode_with(lat: 34.0, lng: 135.0)
      # 住所変更なしでも、他項目変更で before_validation が走れば expired 判定で再ジオコーディング
      place.update!(description: 'touch')

      expect(place.latitude).to  eq(34.0)
      expect(place.longitude).to eq(135.0)
    end
  end
end