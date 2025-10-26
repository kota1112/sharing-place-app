# spec/support/geocoder_stub.rb
module GeocoderStub
    def ensure_geocoder_const!
      # すでに本体があれば何もしない
      return if Object.const_defined?('GeocoderService')
  
      # 本体が無い環境でも verify_partial_doubles を満たすように、
      # google_geocode を「実在する」メソッドとして定義したダミークラスを作る
      klass = Class.new
      klass.define_singleton_method(:google_geocode) { |_addr| nil }
      stub_const('GeocoderService', klass)
    end
  
    def stub_geocode_with(lat:, lng:)
      ensure_geocoder_const!
      allow(GeocoderService).to receive(:google_geocode).and_return({ lat: lat, lng: lng })
    end
  
    def expect_no_geocode_call
      ensure_geocoder_const!
      expect(GeocoderService).not_to receive(:google_geocode)
    end
  end
  
  RSpec.configure do |config|
    config.include GeocoderStub
  end