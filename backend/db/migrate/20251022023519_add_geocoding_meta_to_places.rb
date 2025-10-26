# db/migrate/20251021120000_add_geocoding_meta_to_places.rb
class AddGeocodingMetaToPlaces < ActiveRecord::Migration[8.0]
  def change
    add_column :places, :geocoded_at, :datetime, comment: "Google Geocoding 実行時刻（保存の根拠）"
    add_column :places, :geocode_provider, :string,  comment: "google など"
    add_column :places, :geocode_permitted, :boolean, default: false, null: false,
              comment: "結果の保存・再利用の可否（規約に基づく）"
    add_column :places, :geocode_terms_version, :string, comment: "規約バージョン/根拠メモ"
    add_index  :places, :geocoded_at
    add_column :places, :meta, :json, default: {}
  end
end
