# frozen_string_literal: true
require 'net/http'
require 'uri'
require 'json'

# 使用上の注意（規約準拠）
# - APIレスポンスの“生データ”は長期保存しない
# - 保存は緯度経度＋最小限のメタ（place_id 等）に留める
# - 結果の再配布や長期キャッシュは禁止、アプリ内再利用は最大30日以内

class GoogleGeocoder
  ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json"
  class GeocodeError < StandardError; end

  # 環境変数は GOOGLE_MAPS_API_KEY 優先、なければ GOOGLE_MAPS_GEOCODING_KEY も許容
  def initialize(api_key: ENV["GOOGLE_MAPS_API_KEY"] || ENV["GOOGLE_MAPS_GEOCODING_KEY"])
    @api_key = api_key
    raise GeocodeError, "Missing GOOGLE_MAPS_API_KEY" if @api_key.to_s.empty?
  end

  # address: 住所文字列
  # returns: { lat:, lng:, place_id:, formatted_address: }  ※呼び出し側で必要なものだけ保存する
  def geocode(address, language: 'ja')
    return nil if address.to_s.strip.empty?

    uri = URI(ENDPOINT)
    uri.query = URI.encode_www_form(address: address, key: @api_key, language: language)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.read_timeout = 5
    http.open_timeout = 5

    res = http.get(uri.request_uri)
    raise GeocodeError, "HTTP #{res.code}" unless res.is_a?(Net::HTTPSuccess)

    data = JSON.parse(res.body) rescue {}
    return nil unless data["status"] == "OK" && data["results"].is_a?(Array) && data["results"].first

    first = data["results"].first
    loc   = first.dig("geometry", "location")
    return nil unless loc && loc["lat"] && loc["lng"]

    {
      lat: loc["lat"].to_f,
      lng: loc["lng"].to_f,
      place_id: first["place_id"],
      formatted_address: first["formatted_address"]
    }
  rescue => e
    # ここで例外を握りつぶして nil を返すと、呼び出し側で「失敗時は何もしない」方針にしやすい
    Rails.logger.warn("[GoogleGeocoder] #{e.class}: #{e.message}")
    nil
  end
end