# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_10_28_032711) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"
  enable_extension "unaccent"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "places", force: :cascade do |t|
    t.integer "author_id"
    t.string "name"
    t.text "description"
    t.string "address_line"
    t.string "city"
    t.string "state"
    t.string "postal_code"
    t.string "country"
    t.float "latitude"
    t.float "longitude"
    t.string "google_place_id"
    t.string "phone"
    t.string "website_url"
    t.string "status"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "geocoded_at"
    t.string "geocode_provider"
    t.boolean "geocode_permitted", default: false, null: false
    t.string "geocode_terms_version"
    t.index ["author_id"], name: "index_places_on_author_id"
    t.index ["city"], name: "index_places_on_city_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["created_at"], name: "index_places_on_created_at"
    t.index ["description"], name: "index_places_on_description_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["geocoded_at"], name: "index_places_on_geocoded_at"
    t.index ["google_place_id"], name: "index_places_on_google_place_id"
    t.index ["latitude", "longitude"], name: "index_places_on_latitude_and_longitude"
    t.index ["name"], name: "index_places_on_name_trgm", opclass: :gin_trgm_ops, using: :gin
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "display_name"
    t.string "username"
    t.string "avatar_url"
    t.string "role"
    t.datetime "last_seen_at"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "places", "users", column: "author_id"
end
