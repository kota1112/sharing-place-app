class CreatePlaces < ActiveRecord::Migration[8.0]
  def change
    create_table :places do |t|
      t.references :author, null: true, foreign_key: { to_table: :users }, index: true
      t.string :name
      t.text :description
      t.string :address_line
      t.string :city
      t.string :state
      t.string :postal_code
      t.string :country
      t.float :latitude
      t.float :longitude
      t.string :google_place_id
      t.string :phone
      t.string :website_url
      t.string :status
      t.datetime :deleted_at

      t.timestamps
    end

    # ← ここ（create_table ブロックの “外”）に索引を追記
    add_index :places, [:latitude, :longitude]
    add_index :places, :google_place_id
  

  end
end
