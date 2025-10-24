class Place < ApplicationRecord
  belongs_to :author, class_name: 'User', optional: true
  has_many_attached :photos

  validates :name, presence: true
  validates :latitude,  numericality: { greater_than_or_equal_to: -90,  less_than_or_equal_to: 90 },  allow_nil: true
  validates :longitude, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }, allow_nil: true

  before_validation :geocode_if_needed

  # 住所文字列を組み立て（空値はスキップ）
  def full_address
    [address_line, city, state, postal_code, country].compact_blank.join(' ')
  end

  private

  def geocode_if_needed
    return unless should_geocode?

    if (res = GeocoderService.google_geocode(full_address))
      self.latitude  = res[:lat]
      self.longitude = res[:lng]
      self.google_place_id = res[:place_id] if respond_to?(:google_place_id)
      self.geocoded_at = Time.current
      self.geocode_provider = Rails.application.config.x.geocoding.provider_name
      self.geocode_permitted = true
      self.geocode_terms_version = Rails.application.config.x.geocoding.terms_version
    end
  end

  def should_geocode?
    return false if full_address.blank?

    # 住所が変わった？
    address_changed =
      will_save_change_to_address_line? ||
      will_save_change_to_city? ||
      will_save_change_to_state? ||
      will_save_change_to_postal_code? ||
      will_save_change_to_country?

    coords_blank = latitude.blank? || longitude.blank?

    # 30日超えたら更新
    max_age = Rails.application.config.x.geocoding.max_cache_age
    expired = geocoded_at.present? && Time.current >= (geocoded_at + max_age)

    coords_blank || address_changed || expired
  end
end