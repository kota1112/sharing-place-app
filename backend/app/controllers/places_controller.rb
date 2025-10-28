# app/controllers/places_controller.rb
class PlacesController < ApplicationController
  include Rails.application.routes.url_helpers

  before_action :authenticate_user!, except: %i[index show]
  before_action :set_place, only: %i[show update destroy]

  # GET /places
  def index
    scope = Place.with_attached_photos.order(created_at: :desc)

    q = params[:q].to_s.strip
    if q.present?
      adapter   = ActiveRecord::Base.connection.adapter_name.downcase
      is_pg     = adapter.include?('postgres')
      is_sqlite = adapter.include?('sqlite')

      if is_pg
        # PostgreSQL: ILIKE + pg_trgm similarity で並び替え
        pattern = "%#{q}%"
        concat_sql = "concat_ws(' ', places.address_line, places.city, places.state, places.postal_code, places.country)"

        where_sql = <<~SQL.squish
          places.name ILIKE :p OR
          places.city ILIKE :p OR
          places.description ILIKE :p OR
          #{concat_sql} ILIKE :p
        SQL

        scope = scope.where(where_sql, p: pattern)
        # 類似度で並べる（pg_trgm）
        # similarity() は拡張が有効なら使用可能
        scope = scope.reorder(
          Arel.sql("GREATEST(similarity(places.name, :q), similarity(places.city, :q), similarity(places.description, :q)) DESC, places.created_at DESC")
        ).bind_values([[nil, q]])
      else
        # SQLite/MySQL等：LOWER + LIKE でフォールバック
        like_op   = 'LIKE'
        pattern   = "%#{q.downcase}%"
        name_col  = "LOWER(places.name)"
        city_col  = "LOWER(places.city)"
        desc_col  = "LOWER(places.description)"

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

        scope = scope.where(where_sql.join(' OR '), *binds)
      end
    end

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
  def mine
    places = Place.with_attached_photos
                  .where(author_id: current_user.id)
                  .order(created_at: :desc)
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

  def first_photo_abs_url(place)
    return nil unless place.photos.attached?
    rails_blob_url(place.photos.first, host: request.base_url)
  end

  def attach_photos(record)
    return unless params[:photos].present?
    Array(params[:photos]).each { |file| record.photos.attach(file) }
  end

  def authorize_owner!(place)
    allowed = current_user && (place.author_id == current_user.id || current_user.role == 'admin')
    head :forbidden unless allowed
  end
end
