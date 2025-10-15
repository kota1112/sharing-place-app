class PlacesController < ApplicationController
    include Rails.application.routes.url_helpers
    before_action :authenticate_user!, except: %i[index show]
    before_action :set_place, only: %i[show update destroy]
  
    def index
      render json: Place.order(created_at: :desc).limit(50)
        .as_json(only: %i[id name city description latitude longitude])
    end
  
    def show
      render json: @place.as_json(only: %i[id name description address_line city state postal_code country latitude longitude google_place_id phone website_url])
                       .merge(photo_urls: @place.photos.map{ |p| url_for(p) })
    end
  
    def create
      place = Place.new(place_params.merge(author: current_user))
      if place.save
        attach_photos(place)
        render json: { id: place.id }, status: :created
      else
        render json: { errors: place.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def update
      authorize_owner!(@place)
      if @place.update(place_params)
        attach_photos(@place)
        render json: { ok: true }
      else
        render json: { errors: @place.errors.full_messages }, status: :unprocessable_entity
      end
    end
  
    def destroy
      authorize_owner!(@place); @place.destroy!; head :no_content
    end
  
    private
    def set_place; @place = Place.find(params[:id]); end
    def place_params
      params.require(:place).permit(:name, :description, :address_line, :city, :state, :postal_code, :country,
        :latitude, :longitude, :google_place_id, :phone, :website_url, :status)
    end
    def attach_photos(record)
      return unless params[:photos].present?
      params[:photos].each { |io| record.photos.attach(io) }
    end
    def authorize_owner!(place)
      head :forbidden unless current_user && (place.author_id == current_user.id || current_user.role == 'admin')
    end
  end
  