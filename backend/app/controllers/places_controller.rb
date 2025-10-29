class PlacesController < ApplicationController
  include Rails.application.routes.url_helpers

  # 公開: index/show/suggest
  before_action :authenticate_user!, except: %i[index show suggest]

  # show は include_deleted を考慮する専用セットアップ
  before_action :set_place_for_show, only: :show
  # update/destroy/写真単体削除 用（未削除のみ・default_scope）
  before_action :set_place, only: %i[update destroy destroy_photo delete_photo]

  # GET /places
  # 公開: q（キーワード）対応
  # ?with_deleted=1 / ?only_deleted=1 は「管理者のみ」許可
  def index
    scope = base_scope_for_index
    q = params[:q].to_s.strip
    scope = apply_text_search(scope, q) if q.present?
    places = scope.with_attached_photos.order(created_at: :desc).limit(50)
    render json: places.map { |p| place_index_json(p).merge(deleted_at: p.deleted_at) }
  end

  # GET /places/:id
  # - 既定: 未削除のみ
  # - ?include_deleted=1: オーナー/管理者なら削除済みも取得
  def show
    render json: place_show_json(@place).merge(deleted_at: @place.deleted_at)
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
  # 既存ロジックを保ちつつ、更新前に「写真削除（purge）」を追加
  def update
    authorize_owner!(@place)

    purge_requested_photos(@place) # ★ 先に既存写真の削除を処理（任意）

    if @place.update(place_params)
      attach_photos(@place)         # ★ 追加アップロード（既存処理を温存）
      render json: { ok: true }, status: :ok
    else
      render json: { errors: @place.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /places/:id
  # ソフトデリート
  def destroy
    authorize_owner!(@place)
    @place.update!(deleted_at: Time.current)
    head :no_content
  end

  # POST /places/:id/restore
  def restore
    place = Place.unscoped.find(params[:id])
    authorize_owner!(place)
    place.update!(deleted_at: nil)
    render json: { ok: true }
  end

  # DELETE /places/:id/hard_delete
  def hard_delete
    place = Place.unscoped.find(params[:id])
    authorize_admin!
    place.destroy!
    head :no_content
  end

  # GET /places/mine
  # ?with_deleted=1 / ?only_deleted=1 を“自分の分”に限り許可
  def mine
    scope = base_scope_for_mine
    q = params[:q].to_s.strip
    scope = apply_text_search(scope, q) if q.present?
    places = scope.with_attached_photos.order(created_at: :desc).limit(50)
    render json: places.map { |p| place_index_json(p).merge(deleted_at: p.deleted_at) }
  end

  # ===== オートコンプリート =====
  def suggest
    q = params[:q].to_s.strip
    return render json: [] if q.blank?
    suggestions = build_suggestions(Place.all, q, limit: params[:limit])
    render json: suggestions
  end

  def suggest_mine
    q = params[:q].to_s.strip
    return render json: [] if q.blank?
    scope = Place.where(author_id: current_user.id)
    suggestions = build_suggestions(scope, q, limit: params[:limit])
    render json: suggestions
  end

  # ====== 写真単体削除 ======

  # DELETE /places/:id/photos/:photo_id
  def destroy_photo
    authorize_owner!(@place)
    att = @place.photos.find_by(id: params[:photo_id])
    return render(json: { ok: true }) unless att
    att.purge
    render json: { ok: true }
  end

  # POST /places/:id/delete_photo
  # body: { url: "https://host/rails/active_storage/blobs/..." }
  def delete_photo
    authorize_owner!(@place)
    url = params[:url].to_s
    return render(json: { error: "url required" }, status: :unprocessable_entity) if url.blank?

    found = @place.photos.find { |p| rails_blob_url(p, host: request.base_url) == url }
    return render(json: { error: "photo not found" }, status: :not_found) unless found

    found.purge
    render json: { ok: true }
  end

  private

  # --- Setters ---
  def set_place_for_show
    if params[:include_deleted].present?
      place = Place.unscoped.find(params[:id])
      unless can_view_deleted_record?(place)
        head :forbidden and return
      end
      @place = place
    else
      @place = Place.find(params[:id]) # default_scope（未削除のみ）
    end
  end

  def set_place
    @place = Place.find(params[:id])
  end

  # --- Base scopes ---
  def base_scope_for_index
    if params[:only_deleted].present?
      authorize_admin!
      Place.only_deleted
    elsif params[:with_deleted].present?
      authorize_admin!
      Place.with_deleted
    else
      Place.all
    end
  end

  def base_scope_for_mine
    base =
      if params[:only_deleted].present?
        Place.only_deleted
      elsif params[:with_deleted].present?
        Place.with_deleted
      else
        Place.all
      end
    base.where(author_id: current_user.id)
  end

  # --- Auth helpers ---
  def authorize_owner!(place)
    allowed = current_user && (place.author_id == current_user.id || current_user.role == 'admin')
    head :forbidden unless allowed
  end

  def authorize_admin!
    head :forbidden unless current_user&.role == 'admin'
  end

  def can_view_deleted_record?(place)
    return true unless place.deleted_at.present?
    return true if current_user&.role == 'admin'
    current_user && place.author_id == current_user.id
  end

  # --- Strong params & attachments ---
  def place_params
    params.require(:place).permit(
      :name, :description, :address_line, :city, :state, :postal_code, :country,
      :latitude, :longitude, :google_place_id, :phone, :website_url, :status
    )
  end

  def attach_photos(record)
    return unless params[:photos].present?
    Array(params[:photos]).each { |file| record.photos.attach(file) }
  end

  # 追加: 写真削除（update 前）
  def purge_requested_photos(record)
    raw = params[:photos_to_purge]
    return if raw.blank?

    ids =
      case raw
      when String
        begin
          parsed = JSON.parse(raw)
          Array(parsed)
        rescue JSON::ParserError
          raw.split(",")
        end
      else
        Array(raw)
      end

    ids = ids.filter_map { |v| Integer(v) rescue nil }.uniq
    return if ids.empty?

    record.photos.where(id: ids).find_each(&:purge)
  end

  # --- JSON helpers ---
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
      # ※ 一覧は現状どおり google_place_id を返さない（= 検索優先の挙動を維持）
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
      # google_place_id: place.google_place_id,  # ← ★ 詳細でも返さない（検索優先に統一）
      phone: place.phone,
      website_url: place.website_url,
      full_address: place.full_address,
      photos: place.photos.map { |p|
        {
          id: p.id,
          url: rails_blob_url(p, host: request.base_url),
          filename: p.filename.to_s,
          byte_size: p.byte_size
        }
      },
      photo_urls: place.photos.map { |p| rails_blob_url(p, host: request.base_url) }
    }
  end

  def first_photo_abs_url(place)
    return nil unless place.photos.attached?
    rails_blob_url(place.photos.first, host: request.base_url)
  end

  # ===== 検索 =====
  def apply_text_search(scope, q)
    adapter   = ActiveRecord::Base.connection.adapter_name.downcase
    is_pg     = adapter.include?('postgres')
    is_sqlite = adapter.include?('sqlite')

    if is_pg
      has_cached  = Place.column_names.include?('full_address_cached')
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

      order_sql = if has_cached
        ActiveRecord::Base.send(:sanitize_sql_array,
          ["GREATEST(similarity(places.name, ?),
                     similarity(places.city, ?),
                     similarity(places.description, ?),
                     similarity(places.full_address_cached, ?)) DESC,
                     places.created_at DESC", q, q, q, q])
      else
        ActiveRecord::Base.send(:sanitize_sql_array,
          ["GREATEST(similarity(places.name, ?),
                     similarity(places.city, ?),
                     similarity(places.description, ?)) DESC,
                     places.created_at DESC", q, q, q])
      end

      scope.reorder(Arel.sql(order_sql))
    else
      safe    = ActiveRecord::Base.sanitize_sql_like(q.downcase)
      pattern = "%#{safe}%"
      is_sqlite_like = is_sqlite

      name_col = "LOWER(places.name)"
      city_col = "LOWER(places.city)"
      desc_col = "LOWER(places.description)"
      concat_sql =
        if is_sqlite_like
          "LOWER(COALESCE(places.address_line,'') || ' ' || COALESCE(places.city,'') || ' ' || COALESCE(places.state,'') || ' ' || COALESCE(places.postal_code,'') || ' ' || COALESCE(places.country,''))"
        else
          "LOWER(CONCAT_WS(' ', places.address_line, places.city, places.state, places.postal_code, places.country))"
        end

      where_sql = []
      binds = []
      where_sql << "#{name_col} LIKE ?";  binds << pattern
      where_sql << "#{city_col} LIKE ?";  binds << pattern
      where_sql << "#{desc_col} LIKE ?";  binds << pattern
      where_sql << "#{concat_sql} LIKE ?"; binds << pattern

      scope.where(where_sql.join(' OR '), *binds)
    end
  end

  # ===== サジェスト生成 =====
  def build_suggestions(scope, q, limit:)
    lim = limit.present? ? limit.to_i.clamp(1, 20) : 8

    adapter   = ActiveRecord::Base.connection.adapter_name.downcase
    is_pg     = adapter.include?('postgres')
    is_sqlite = adapter.include?('sqlite')

    if is_pg
      has_cached   = Place.column_names.include?('full_address_cached')
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

      order_sql = if has_cached
        ActiveRecord::Base.send(:sanitize_sql_array,
          ["GREATEST(similarity(places.name, ?),
                     similarity(places.city, ?),
                     similarity(places.description, ?),
                     similarity(#{address_expr}, ?)) DESC,
                     places.created_at DESC", q, q, q, q])
      else
        ActiveRecord::Base.send(:sanitize_sql_array,
          ["GREATEST(similarity(places.name, ?),
                     similarity(places.city, ?),
                     similarity(places.description, ?)) DESC,
                     places.created_at DESC", q, q, q])
      end

      rows = scope
               .where(where_sql, p: pattern)
               .select("places.name, places.city, #{address_expr} AS full_addr")
               .reorder(Arel.sql(order_sql))
               .limit(50)

      pool = []
      rows.each { |r| [r.name, r.city, r.try(:full_addr)].each { |v| pool << v unless v.blank? } }

      qd = q.downcase
      uniq = []
      seen = {}
      pool.each { |v| (seen[v] ||= false) or (seen[v] = true; uniq << v) }
      contains = uniq.select { |v| v.downcase.include?(qd) }
      others   = uniq.reject { |v| v.downcase.include?(qd) }
      (contains + others).take(lim)
    else
      safe    = ActiveRecord::Base.sanitize_sql_like(q.downcase)
      pattern = "%#{safe}%"

      name_col = "LOWER(places.name)"
      city_col = "LOWER(places.city)"
      desc_col = "LOWER(places.description)"
      concat_sql =
        if is_sqlite
          "LOWER(COALESCE(places.address_line,'') || ' ' || COALESCE(places.city,'') || ' ' || COALESCE(places.state,'') || ' ' || COALESCE(places.postal_code,'') || ' ' || COALESCE(places.country,''))"
        else
          "LOWER(CONCAT_WS(' ', places.address_line, places.city, places.state, places.postal_code, places.country))"
        end

      where_sql = <<~SQL.squish
        #{name_col} LIKE :p
        OR #{city_col} LIKE :p
        OR #{desc_col} LIKE :p
        OR #{concat_sql} LIKE :p
      SQL

      rows = scope
               .where(where_sql, p: pattern)
               .select("places.name, places.city, CONCAT_WS(' ', places.address_line, places.city, places.state, places.postal_code, places.country) AS full_addr")
               .order(created_at: :desc)
               .limit(50)

      pool = []
      rows.each { |r| [r.name, r.city, r.try(:full_addr)].each { |v| pool << v unless v.blank? } }
      pool.uniq.take(lim)
    end
  end
end
