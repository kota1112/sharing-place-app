# frozen_string_literal: true

class GeocoderService
    class << self
      # 戻り: { lat:, lng:, place_id: } または nil（失敗/スキップ時）
      def google_geocode(address)
        addr = address.to_s.strip
        return nil if addr.empty?
  
        # どちらの環境変数名でも拾えるように
        api_key = ENV["GOOGLE_MAPS_API_KEY"] || ENV["GOOGLE_MAPS_GEOCODING_KEY"]
        if api_key.to_s.empty?
          Rails.logger.info("[GeocoderService] skipped geocode: no API key")
          return nil
        end
  
        begin
          service = GoogleGeocoder.new(api_key: api_key)
          res = service.geocode(addr)
          return nil unless res
  
          { lat: res[:lat], lng: res[:lng], place_id: res[:place_id] }
        rescue => e
          Rails.logger.warn("[GeocoderService] #{e.class}: #{e.message}")
          nil
        end
      end
    end
  end