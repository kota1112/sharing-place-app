# app/services/geocoder_service.rb
class GeocoderService
    # 本番では Google Geocoding API を呼ぶ想定。
    # RSpec ではこのメソッドを stub するので、ここは最小でOK。
    #
    # 返り値例: { lat: 35.0, lng: 135.0 } / エラー時は nil
    def self.google_geocode(full_address)
      return nil if full_address.blank?
      nil
    end
  end