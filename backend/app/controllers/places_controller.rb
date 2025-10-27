class PlacesController < ApplicationController
  include Rails.application.routes.url_helpers

  # index / show は公開。それ以外は JWT 必須
  before_action :authenticate_user!, except: %i[index show]
  before_action :set_place, only: %i[show update destroy]

  # GET /places
  # 公開：軽量フィールド + 先頭写真URL（なければ null）
  # params:
  #   q: 検索キーワード（任意）
  def index
    scope = Place.with_attached_photos.order(created_at: :desc)

    q = params[:q].to_s.strip
    if q.present?
      adapter = ActiveRecord::Base.connection.adapter_name.downcase
      is_pg   = adapter.include?("postgres")
      is_sqlite = adapter.include?("sqlite")
      # LIKE 演算子（PGのみ ILIKE を使用）
      like_op = is_pg ? "ILIKE" : "LIKE"

      # 比較値（PG 以外は LOWER(...) と合わせる）
      pattern = is_pg ? "%#{q}%" : "%#{q.downcase}%"

      # カラム式（PG 以外は LOWER を噛ませる）
      name_col =  is_pg ? "places.name"        : "LOWER(places.name)"
      city_col =  is_pg ? "places.city"        : "LOWER(places.city)"
      desc_col =  is_pg ? "places.description" : "LOWER(places.description)"

      # 住所の連結（DBごとに式を切り替え）
      concat_sql =
        if is_sqlite
          # SQLite: || と COALESCE で連結、全体に LOWER
          "LOWER(COALESCE(places.address_line,'') || ' ' || " \
          "COALESCE(places.city,'') || ' ' || COALESCE(places.state,'') || ' ' || " \
          "COALESCE(places.postal_code,'') || ' ' || COALESCE(places.country,''))"
        elsif is_pg
          # PostgreSQL: concat_ws（ILIKE なので LOWER 不要）
          "concat_ws(' ', places.address_line, places.city, places.state, places.postal_code, places.country)"
        else
          # MySQL 等: CONCAT_WS + LOWER（照合次第だが LOWER 付けておく）
          "LOWER(CONCAT_WS(' ', places.address_line, places.city, places.state, places.postal_code, places.country))"
        end

      where_sql = []
      binds = []

      where_sql << "#{name_col} #{like_op} ?"
      binds     << pattern

      where_sql << "#{city_col} #{like_op} ?"
      binds     << pattern

      where_sql << "#{desc_col} #{like_op} ?"
      binds     << pattern

      where_sql << "#{concat_sql} #{like_op} ?"
      binds     << pattern

      scope = scope.where(where_sql.join(" OR "), *binds)
    end

    places = scope.limit(50)
    render json: places.map { |p| place_index_json(p) }
  end

  # GET /places/:id
  # 公開：住所/連絡先/写真URLまで返す
  def show
    render json: place_show_json(@place)
  end

  # POST /places
  # 要JWT：オーナーは current_user
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
  # 要JWT：オーナー or admin のみ
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
  # 要JWT：オーナー or admin のみ
  def destroy
    authorize_owner!(@place)
    @place.destroy!
    head :no_content
  end

  # GET /places/mine
  # 自分が作成した Place の一覧（要JWT）
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

  # 作成/更新で受け付ける項目
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
      # 追加フィールド（フロントの検索/表示に使用）
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
    Array(params[:photos]).each do |file|
      record.photos.attach(file)
    end
  end

  # オーナー or admin チェック
  def authorize_owner!(place)
    allowed = current_user &&
      (place.author_id == current_user.id || current_user.role == 'admin')
    head :forbidden unless allowed
  end
end
