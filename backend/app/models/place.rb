# app/models/place.rb
class Place < ApplicationRecord
  # --- Associations ---
  belongs_to :author, class_name: "User", optional: true
  has_many_attached :photos

  # --- Normalization ---
  before_validation :strip_strings
  before_validation :nilify_blank_coords
  before_validation :geocode_if_needed

  # --- Validations ---
  validates :name, presence: true, length: { maximum: 255 }
  validates :description, length: { maximum: 10_000 }, allow_nil: true

  validates :latitude,
            numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 },
            allow_nil: true
  validates :longitude,
            numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 },
            allow_nil: true

  validates :website_url, length: { maximum: 2048 }, allow_blank: true
  validates :phone,       length: { maximum: 100 },   allow_blank: true

  # 添付ファイルの安全チェック（今回追加）
  validate :acceptable_photos

  # --- Soft Delete ---
  # これがある前提で controller 側は unscoped/with_deleted を呼んでいたので残す
  default_scope { where(deleted_at: nil) }
  scope :with_deleted, -> { unscope(where: :deleted_at) }
  scope :only_deleted, -> { unscoped.where.not(deleted_at: nil) }

  def soft_deleted?
    deleted_at.present?
  end

  # --- Helpers: Address ---
  def full_address
    [address_line, city, state, postal_code, country].compact_blank.join(" ")
  end

  # フロント互換（full_address と同じ）
  def address
    full_address
  end

  # --- Search scope (DB依存ロジックは安全に分岐) ---
  scope :search_text, ->(q) {
    q = q.to_s.strip
    next all if q.blank?

    adapter = ActiveRecord::Base.connection.adapter_name.downcase
    if adapter.include?("postgres")
      like = "%#{ActiveRecord::Base.sanitize_sql_like(q)}%"
      where(<<~SQL.squish, p: like)
        places.name ILIKE :p
        OR places.city ILIKE :p
        OR places.description ILIKE :p
        OR concat_ws(' ', places.address_line, places.city, places.state, places.postal_code, places.country) ILIKE :p
      SQL
    else
      like = "%#{ActiveRecord::Base.sanitize_sql_like(q.downcase)}%"
      where(<<~SQL.squish, p: like)
        LOWER(places.name) LIKE :p
        OR LOWER(places.city) LIKE :p
        OR LOWER(places.description) LIKE :p
        OR LOWER(
          COALESCE(places.address_line,'') || ' ' ||
          COALESCE(places.city,'') || ' ' ||
          COALESCE(places.state,'') || ' ' ||
          COALESCE(places.postal_code,'') || ' ' ||
          COALESCE(places.country,'')
        ) LIKE :p
      SQL
    end
  }

  private

  # --- ActiveStorage validation (added) ---
  #
  # ファイル・写真のバッファオーバーフロー対策：
  # - サイズを 10MB に制限
  # - 画像系のMIMEだけ許可
  def acceptable_photos
    return unless photos.attached?

    max_size_mb    = 10
    max_size_bytes = max_size_mb.megabytes
    allowed_types  = %w[image/jpeg image/png image/webp image/jpg]

    photos.each do |photo|
      if photo.byte_size > max_size_bytes
        errors.add(:photos, "is too big (max #{max_size_mb}MB)")
      end

      unless allowed_types.include?(photo.content_type)
        errors.add(:photos, "must be JPEG, PNG, or WebP")
      end
    end
  end

  # --- Normalizers ---
  def strip_strings
    %i[name description address_line city state postal_code country phone website_url].each do |attr|
      v = self[attr]
      self[attr] = v.is_a?(String) ? v.strip.presence : v
    end
  end

  def nilify_blank_coords
    self.latitude  = nil if latitude.is_a?(String)  && latitude.strip.blank?
    self.longitude = nil if longitude.is_a?(String) && longitude.strip.blank?
  end

  # --- Geocoding (任意機能・未設定でも落ちない) ---
  def geocode_if_needed
    return unless should_geocode?
    return unless defined?(GeocoderService) && GeocoderService.respond_to?(:google_geocode)

    if (res = GeocoderService.google_geocode(full_address))
      self.latitude         = res[:lat]
      self.longitude        = res[:lng]
      self.google_place_id  = res[:place_id] if respond_to?(:google_place_id)
      self.geocoded_at      = Time.current   if respond_to?(:geocoded_at)
      self.geocode_provider = safe_geocode_config(:provider_name)
      self.geocode_permitted = true          if respond_to?(:geocode_permitted)
      self.geocode_terms_version = safe_geocode_config(:terms_version)
    end
  rescue => e
    Rails.logger.warn("[Place#geocode_if_needed] skipped: #{e.class} #{e.message}")
    true
  end

  def should_geocode?
    return false if full_address.blank?

    address_changed =
      will_save_change_to_address_line? ||
      will_save_change_to_city? ||
      will_save_change_to_state? ||
      will_save_change_to_postal_code? ||
      will_save_change_to_country?

    coords_blank = latitude.blank? || longitude.blank?
    max_age = safe_geocode_config(:max_cache_age) || 30.days
    expired = respond_to?(:geocoded_at) && geocoded_at.present? && Time.current >= (geocoded_at + max_age)

    coords_blank || address_changed || expired
  end

  def safe_geocode_config(key)
    cfg = Rails.application.config.x
    return nil unless cfg.respond_to?(:geocoding) && cfg.geocoding.respond_to?(key)
    cfg.geocoding.public_send(key)
  end
end
