# app/models/user.rb
class User < ApplicationRecord
  # Devise modules:
  # - database_authenticatable / registerable / validatable は従来通り
  # - jwt_authenticatable で devise-jwt を使用（Null 戦略＝ブラックリストなし）
  # - recoverable / rememberable は既存のまま温存
  devise :database_authenticatable, :registerable, :recoverable,
         :rememberable, :validatable, :jwt_authenticatable,
         jwt_revocation_strategy: Devise::JWT::RevocationStrategies::Null

  # === Associations ===
  has_many :social_identities, dependent: :destroy
  has_many :places, foreign_key: :author_id, dependent: :nullify
  has_many :favorites, dependent: :destroy

  # === Soft delete helpers (users.deleted_at は任意運用) ===
  scope :alive,        -> { where(deleted_at: nil) }
  scope :only_deleted, -> { where.not(deleted_at: nil) }

  # === Validations ===
  # username は任意・一意（DB 側は unique index 推奨）
  validates :username,
            uniqueness: { case_sensitive: false },
            allow_nil: true,
            length: { maximum: 50 },
            format: { with: /\A[a-zA-Z0-9_.-]+\z/, message: "allows only letters, numbers, _ . -" },
            if: -> { username.present? }

  # display_name は任意（長さのみ軽く制限）
  validates :display_name, length: { maximum: 100 }, allow_nil: true

  # avatar_url は任意（簡易 URL チェック）
  validates :avatar_url, length: { maximum: 500 }, allow_nil: true

  # === Callbacks ===
  before_validation :normalize_username
  before_save :touch_last_seen_on_password_or_login

  # === Roles ===
  # role は string カラム（"admin" / "user" など）。enum で縛らない軽量運用。
  def admin?
    role.to_s.downcase == "admin"
  end

  # 表示名のフォールバック
  def display_name_or_email
    display_name.presence || username.presence || email
  end

  private

  def normalize_username
    self.username = username.strip if username.is_a?(String)
  end

  def touch_last_seen_on_password_or_login
    # 任意：パスワード変更やログインのタイミングで last_seen_at を更新したい場合の軽い例
    # 実際のログイン時更新は SessionsController#me 等で行う方が明確なこともあります。
    self.last_seen_at ||= Time.current if encrypted_password_changed?
  end
end
