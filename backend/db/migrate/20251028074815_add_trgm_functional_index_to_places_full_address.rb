# db/migrate/20251028074815_add_trgm_functional_index_to_places_full_address.rb
class AddTrgmFunctionalIndexToPlacesFullAddress < ActiveRecord::Migration[8.0]
  def up
    # Postgres 以外では何もしない
    return unless ActiveRecord::Base.connection.adapter_name.downcase.include?('postgres')

    # 1) 生成列を追加（住所要素を結合したキャッシュ列）
    # STORED なので DB が自動的に再計算して保持してくれる
    execute <<~SQL
      ALTER TABLE places
      ADD COLUMN IF NOT EXISTS full_address_cached text
      GENERATED ALWAYS AS (
        COALESCE(address_line,'') || ' ' ||
        COALESCE(city,'')         || ' ' ||
        COALESCE(state,'')        || ' ' ||
        COALESCE(postal_code,'')  || ' ' ||
        COALESCE(country,'')
      ) STORED;
    SQL

    # 2) 生成列にトライグラム GIN インデックス
    enable_extension 'pg_trgm' unless extension_enabled?('pg_trgm')
    unless index_exists?(:places, :full_address_cached, name: 'index_places_on_full_address_cached_trgm')
      add_index :places, :full_address_cached,
                using: :gin, opclass: :gin_trgm_ops,
                name: 'index_places_on_full_address_cached_trgm'
    end
  end

  def down
    return unless ActiveRecord::Base.connection.adapter_name.downcase.include?('postgres')

    if index_exists?(:places, :full_address_cached, name: 'index_places_on_full_address_cached_trgm')
      remove_index :places, name: 'index_places_on_full_address_cached_trgm'
    end
    # 生成列を削除
    if column_exists?(:places, :full_address_cached)
      remove_column :places, :full_address_cached
    end
  end
end
