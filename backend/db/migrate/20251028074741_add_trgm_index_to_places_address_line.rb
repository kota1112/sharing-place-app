class AddTrgmIndexToPlacesAddressLine < ActiveRecord::Migration[8.0]
  def up
    enable_extension "pg_trgm"  unless extension_enabled?("pg_trgm")
    enable_extension "unaccent" unless extension_enabled?("unaccent")

    unless index_exists?(:places, :address_line, name: "index_places_on_address_line_trgm")
      add_index :places, :address_line,
                using:   :gin,
                opclass: :gin_trgm_ops,
                name:    "index_places_on_address_line_trgm"
    end
  end

  def down
    remove_index :places, name: "index_places_on_address_line_trgm" if index_exists?(:places, name: "index_places_on_address_line_trgm")
  end
end
