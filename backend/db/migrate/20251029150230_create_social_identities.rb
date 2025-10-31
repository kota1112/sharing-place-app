class CreateSocialIdentities < ActiveRecord::Migration[8.0]
  def change
    create_table :social_identities do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider
      t.string :provider_uid
      t.text :access_token
      t.text :refresh_token
      t.datetime :expires_at
      t.jsonb :raw_info

      t.timestamps
    end
  end
end
