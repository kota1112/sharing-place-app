# app/models/user.rb
class User < ApplicationRecord
  # =========================
  # Devise
  # =========================
  # 既存の構成をそのまま維持（DBパスワード + サインアップ + パスワード再発行 + remember + JWT）
  devise :database_authenticatable, :registerable, :recoverable,
         :rememberable, :validatable, :jwt_authenticatable,
         jwt_revocation_strategy: Devise::JWT::RevocationStrategies::Null

  # =========================
  # Associations
  # =========================
  has_many :social_identities, dependent: :destroy
  has_many :places,    foreign_key: :author_id, dependent: :nullify
  has_many :favorites, dependent: :destroy

  # =========================
  # Soft delete helpers
  # =========================
  scope :alive,        -> { where(deleted_at: nil) }
  scope :only_deleted, -> { where.not(deleted_at: nil) }

  # =========================
  # Validations
  # =========================
  validates :username,
            uniqueness: { case_sensitive: false },
            allow_nil: true,
            length: { maximum: 50 },
            format: { with: /\A[a-zA-Z0-9_.-]+\z/, message: "allows only letters, numbers, _ . -" },
            if: -> { username.present? }

  validates :display_name, length: { maximum: 100 }, allow_nil: true
  validates :avatar_url,   length: { maximum: 500 }, allow_nil: true

  # =========================
  # Callbacks
  # =========================
  before_validation :normalize_username
  before_save :touch_last_seen_on_password_or_login

  # =========================
  # Roles
  # =========================
  def admin?
    role.to_s.downcase == "admin"
  end

  # 表示名のフォールバック
  def display_name_or_email
    display_name.presence || username.presence || email
  end

  # =========================
  # OAuth / Social helpers
  # =========================

  # どのプロバイダが紐付いているかを配列で返す
  # 例: ["google"]
  def linked_providers
    # N+1を避けるため pluck にしておく（/auth/me からも使える想定）
    social_identities.pluck(:provider)
  end

  # Googleが付いているかどうかを一発で見たい時用
  # controller の forgot_via_google からもこれを使えばよい
  def google_linked?
    linked_providers.include?("google")
  end

  # このユーザーがパスワードログインの手段をもっているか
  def has_password?
    encrypted_password.present?
  end

  # 外部連携を外してもログイン手段が残るかどうかのチェック
  def can_unlink_provider?(provider)
    # そのprovider以外の外部連携があるならOK
    other_oauth_exists = social_identities.where.not(provider: provider).exists?
    return true if other_oauth_exists
    # パスワードがあるならOK
    return true if has_password?
    # どちらも無い → 外すとログインできなくなるのでNG
    false
  end

  private

  def normalize_username
    self.username = username.strip if username.is_a?(String)
  end

  def touch_last_seen_on_password_or_login
    # パスワードが変わったときに last_seen_at を最低限埋めておく
    self.last_seen_at ||= Time.current if encrypted_password_changed?
  end
end
