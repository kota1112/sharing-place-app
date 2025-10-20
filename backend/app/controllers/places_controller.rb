# app/controllers/places_controller.rb
class PlacesController < ApplicationController
  include Rails.application.routes.url_helpers

  # index / show は公開。それ以外は JWT 必須
  before_action :authenticate_user!, except: %i[index show]
  before_action :set_place, only: %i[show update destroy]

  # GET /places
  # 公開：軽量フィールドのみ
  def index
    places = Place.order(created_at: :desc).limit(50)
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
  # ★追加：自分が作成した Place の一覧（要JWT）
  def mine
    places = Place.where(author_id: current_user.id).order(created_at: :desc)
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

  # index / mine 用（軽量）
  def place_index_json(place)
    {
      id: place.id,
      name: place.name,
      city: place.city,
      description: place.description,
      latitude: place.latitude,
      longitude: place.longitude
    }
  end

  # show 用（詳細 + 写真URL）
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
      photo_urls: place.photos.map { |p| url_for(p) }
    }
  end

  # multipart/form-data の photos[] を受け取って添付
  # Thunder Client/ブラウザ：Body -> Form で photos[] を複数ファイル指定
  def attach_photos(record)
    return unless params[:photos].present?
    Array(params[:photos]).each do |file|
      # file は ActionDispatch::Http::UploadedFile を想定
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
