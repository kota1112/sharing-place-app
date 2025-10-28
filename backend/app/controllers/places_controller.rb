# app/controllers/places_controller.rb
class PlacesController < ApplicationController
  include Rails.application.routes.url_helpers

  before_action :authenticate_user!, except: %i[index show]
  before_action :set_place, only: %i[show update destroy]

  # GET /places
  # 公開: q（キーワード）対応
  def index
    scope = Place.with_attached_photos.order(created_at: :desc)
    q = params[:q].to_s.strip
    scope = apply_text_search(scope, q) if q.present?
    places = scope.limit(50)
    render json: places.map { |p| place_index_json(p) }
  end

  # GET /places/:id
  def show
    render json: place_show_json(@place)
  end

  # POST /places
  def create
    place = Place.new(place_params.merge(author: current_user))
    if place.save
      attach_photos(place)
      render json: { id: place.id }, status: :created
    else
      render json: { errors: place.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /places/:id
  def update
    authorize_owner!(@place)
    if @place.update(place_params)
      attach_photos(@place)
      render json: { ok: true }, status: :ok
    else
      render json: { errors: @place.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /places/:id
  def destroy
    authorize_owner!(@place)
    @place.destroy!
    head :no_content
  end

  # GET /places/mine
  # 要JWT: 自分の Place + q（キーワード）対応
  def mine
    scope = Place.with_attached_photos
                 .where(author_id: current_user.id)
                 .order(created_at: :desc)
    q = params[:q].to_s.strip
    scope = apply_text_search(scope, q) if q.present?
    places = scope.limit(50)
    render json: places.map { |p| place_index_json(p) }
  end

  private

  def set_place
    @place = Place.find(params[:id])
  end

  def place_params
    params.require(:place).permit(
      :name, :description, :address_line, :city, :state, :postal_code, :country,
      :latitude, :longitude, :google_place_id, :phone, :website_url, :status
    )
  end

  # index / mine 用（軽量 + 先頭写真URL）
  def place_index_json(place)
    {
      id: place.id,
      name: place.name,
      city: place.city,
      description: place.description,
      latitude: place.latitude,
      longitude: place.longitude,
      first_photo_url: first_photo_abs_url(place),
      address_line: place.address_line,
      full_address: place.full_address,
      address: place.address
    }
  end

  # show 用（詳細 + 写真URL配列）
  def place_show_json(place)
    {
      id: place.id,
      name: place.name,
      description: place.description,
      address_line: place.address_line,
      city: place.city,
      state: place.state,
      postal_code: place.postal_code,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      google_place_id: place.google_place_id,
      phone: place.phone,
      website_url: place.website_url,
      full_address: place.full_address,
      photo_urls: place.photos.map { |p| rails_blob_url(p, host: request.base_url) }
    }
  end

  # 先頭写真の絶対URL（なければ nil）
  def first_photo_abs_url(place)
    return nil unless place.photos.attached?
    rails_blob_url(place.photos.first, host: request.base_url)
  end

  # multipart/form-data の photos[] を受け取って添付
  def attach_photos(record)
    return unless params[:photos].present?
    Array(params[:photos]).each { |file| record.photos.attach(file) }
  end

  # オーナー or admin チェック
  def authorize_owner!(place)
    allowed = current_user && (place.author_id == current_user.id || current_user.role == 'admin')
    head :forbidden unless allowed
  end

  # ===== 共通: テキスト検索（PostgreSQL最適化／他DBフォールバック） =====
  def apply_text_search(scope, q)
    adapter   = ActiveRecord::Base.connection.adapter_name.downcase
    is_pg     = adapter.include?('postgres')
    is_sqlite = adapter.include?('sqlite')

    if is_pg
      # full_address_cached がスキーマに存在すれば優先利用（関数インデックス不要で高速）
      has_cached = Place.column_names.include?('full_address_cached')
      address_expr = has_cached ? 'places.full_address_cached' :
                                  "concat_ws(' ', places.address_line, places.city, places.state, places.postal_code, places.country)"

      safe    = ActiveRecord::Base.sanitize_sql_like(q)
      pattern = "%#{safe}%"

      where_sql = <<~SQL.squish
        places.name ILIKE :p
        OR places.city ILIKE :p
        OR places.description ILIKE :p
        OR #{address_expr} ILIKE :p
      SQL
      scope = scope.where(where_sql, p: pattern)

      # 類似度で並べ替え（pg_trgm）
      order_sql = if has_cached
        ActiveRecord::Base.send(
          :sanitize_sql_array,
          [
            "GREATEST(similarity(places.name, ?),
                      similarity(places.city, ?),
                      similarity(places.description, ?),
                      similarity(places.full_address_cached, ?)) DESC,
                      places.created_at DESC",
            q, q, q, q
          ]
        )
      else
        ActiveRecord::Base.send(
          :sanitize_sql_array,
          [
            "GREATEST(similarity(places.name, ?),
                      similarity(places.city, ?),
                      similarity(places.description, ?)) DESC,
                      places.created_at DESC",
            q, q, q
          ]
        )
      end

      scope.reorder(Arel.sql(order_sql))
    else
      # SQLite/MySQL 等: LOWER + LIKE
      safe    = ActiveRecord::Base.sanitize_sql_like(q.downcase)
      pattern = "%#{safe}%"
      like_op = 'LIKE'
      name_col = "LOWER(places.name)"
      city_col = "LOWER(places.city)"
      desc_col = "LOWER(places.description)"

      concat_sql =
        if is_sqlite
          "LOWER(COALESCE(places.address_line,'') || ' ' || COALESCE(places.city,'') || ' ' || COALESCE(places.state,'') || ' ' || COALESCE(places.postal_code,'') || ' ' || COALESCE(places.country,''))"
        else
          "LOWER(CONCAT_WS(' ', places.address_line, places.city, places.state, places.postal_code, places.country))"
        end

      where_sql = []
      binds = []
      where_sql << "#{name_col} #{like_op} ?";  binds << pattern
      where_sql << "#{city_col} #{like_op} ?";  binds << pattern
      where_sql << "#{desc_col} #{like_op} ?";  binds << pattern
      where_sql << "#{concat_sql} #{like_op} ?"; binds << pattern

      scope.where(where_sql.join(' OR '), *binds)
    end
  end
end
