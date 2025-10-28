# db/migrate/20251028000000_enable_pg_search_extensions.rb
class EnablePgSearchExtensions < ActiveRecord::Migration[8.0]
  def up
    enable_extension "pg_trgm"  unless extension_enabled?("pg_trgm")
    enable_extension "unaccent" unless extension_enabled?("unaccent")

    # 代表的カラムにトライグラム GIN インデックス
    add_index :places, :name,        using: :gin, opclass: :gin_trgm_ops, name: "index_places_on_name_trgm"        unless index_exists?(:places, :name, name: "index_places_on_name_trgm")
    add_index :places, :city,        using: :gin, opclass: :gin_trgm_ops, name: "index_places_on_city_trgm"        unless index_exists?(:places, :city, name: "index_places_on_city_trgm")
    add_index :places, :description, using: :gin, opclass: :gin_trgm_ops, name: "index_places_on_description_trgm" unless index_exists?(:places, :description, name: "index_places_on_description_trgm")
    add_index :places, :created_at   unless index_exists?(:places, :created_at)
  end

  def down
    remove_index :places, name: "index_places_on_name_trgm"        if index_exists?(:places, name: "index_places_on_name_trgm")
    remove_index :places, name: "index_places_on_city_trgm"        if index_exists?(:places, name: "index_places_on_city_trgm")
    remove_index :places, name: "index_places_on_description_trgm" if index_exists?(:places, name: "index_places_on_description_trgm")
    remove_index :places, :created_at                              if index_exists?(:places, :created_at)
    disable_extension "unaccent" if extension_enabled?("unaccent")
    disable_extension "pg_trgm"  if extension_enabled?("pg_trgm")
  end
end
