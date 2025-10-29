class SocialIdentity < ApplicationRecord
  belongs_to :user
  validates :provider, :provider_uid, presence: true
  validates :provider_uid, uniqueness: { scope: :provider }
end
