# app/controllers/places_controller.rb
class PlacesController < ApplicationController
  include Rails.application.routes.url_helpers

  # 公開で見せるのは index / show / suggest / map
  # （自分のサジェストはログイン必須なので除外しない）
  before_action :authenticate_user!, except: %i[index show suggest map]

  # show は ?include_deleted=1 を考慮するので専用で取得
  before_action :set_place_for_show, only: :show
  # update/destroy/写真単体削除 用（基本は未削除スコープでOK）
  before_action :set_place, only: %i[update destroy destroy_photo delete_photo]

  # GET /places
  # 公開: q（キーワード）対応
  # ?with_deleted=1 / ?only_deleted=1 は「管理者のみ」許可
  # ここでページネーションを導入する（?page & ?per）
  def index
    scope = base_scope_for_index

    q = params[:q].to_s.strip
    scope = apply_text_search(scope, q) if q.present?

    page, per = pagination_params
    total_count = scope.count

    places = scope
               .with_attached_photos
               .order(created_at: :desc)
               .offset((page - 1) * per)
               .limit(per)

    render json: {
      data: places.map { |p| place_index_json(p).merge(deleted_at: p.deleted_at) },
      meta: {
        page: page,
        per: per,
        total: total_count,
        total_pages: (total_count.to_f / per).ceil
      }
    }
  end

  # GET /places/:id
  # - 既定: 未削除のみ
  # - ?include_deleted=1: オーナー/管理者なら削除済みも参照可
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

    # 先に既存写真の削除を処理（params[:photos_to_purge]）
    purge_requested_photos(@place)

    if @place.update(place_params)
      # 追加アップロード（既存処理を温存）
      attach_photos(@place)
      render json: { ok: true }, status: :ok
    else
      render json: { errors: @place.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /places/:id
  # ソフトデリート（deleted_at を立てるだけ）
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
  # ここもページネーションを導入する
  def mine
    scope = base_scope_for_mine

    q = params[:q].to_s.strip
    scope = apply_text_search(scope, q) if q.present?

    page, per = pagination_params
    total_count = scope.count

    places = scope
               .with_attached_photos
               .order(created_at: :desc)
               .offset((page - 1) * per)
               .limit(per)

    render json: {
      data: places.map { |p| place_index_json(p).merge(deleted_at: p.deleted_at) },
      meta: {
        page: page,
        per: per,
        total: total_count,
        total_pages: (total_count.to_f / per).ceil
      }
    }
  end

  # GET /places/map
  # フロントのマップから呼ぶ “見えている範囲だけ” を返すAPI
  # params:
  #   nelat, nelng, swlat, swlng  ... 表示中の四角
  #   zoom                        ... ズームレベル (int)
  #   q                           ... 検索キーワード
  #   limit                       ... 最大件数（サーバ側でも上限を掛ける）
  def map
    # 1. パラメータ取得
    nelat = params[:nelat].to_f
    nelng = params[:nelng].to_f
    swlat = params[:swlat].to_f
    swlng = params[:swlng].to_f
    zoom  = params[:zoom].to_i

    limit = params[:limit].to_i
    max_limit = 300
    limit = max_limit  if limit <= 0
    limit = max_limit  if limit > max_limit 

    # 2. ベーススコープ（公開＋未削除）
    #    Place.kept があるならそれを使う。なければ deleted_at: nil で。
    scope = if Place.respond_to?(:kept)
              Place.kept
            else
              Place.where(deleted_at: nil)
            end

    # 3. キーワード
    scope = apply_text_search(scope, params[:q].to_s.strip) if params[:q].present?

    # 4. ビューポートで絞る
    # 経度が日付変更線をまたぐケースは今回はシンプルに2パターンで対応
    if nelng >= swlng
      # 通常の矩形
      scope = scope.where(latitude: swlat..nelat)
                   .where(longitude: swlng..nelng)
    else
      # 180度またぎ → 2本に分けて OR
      scope = scope.where(latitude: swlat..nelat)
                   .where("(longitude >= :swlng OR longitude <= :nelng)", swlng: swlng, nelng: nelng)
    end

    # 5. ズームに応じて粒度を変えるのは後でやるとして、今は素直に返す
    places = scope.limit(limit)

    render json: {
      data: places.map { |p|
        {
          id: p.id,
          name: p.name,
          lat: p.latitude,
          lng: p.longitude,
          address: (p.respond_to?(:address) && p.address.presence) || p.try(:full_address),
          first_photo_url: first_photo_abs_url(p)
        }
      },
      meta: {
        count: places.size,
        zoom: zoom
      }
    }
  end

  # ===== オートコンプリート =====
  # GET /places/suggest?q=...
  def suggest
    q = params[:q].to_s.strip
    return render json: [] if q.blank?

    suggestions = build_suggestions(Place.all, q, limit: params[:limit])
    render json: suggestions
  end

  # GET /places/suggest_mine?q=...
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
  #
  # body の例:
  #   { "url": "https://.../rails/active_storage/blobs/..." }
  #   { "photo_id": 123 }
  def delete_photo
    authorize_owner!(@place)

    url      = params[:url].to_s
    photo_id = params[:photo_id].presence || params[:id_to_delete].presence

    target =
      if photo_id.present?
        @place.photos.find_by(id: photo_id)
      elsif url.present?
        @place.photos.find do |p|
          rails_blob_url(p, host: request.base_url) == url
        end
      end

    return render(json: { error: "photo not found" }, status: :not_found) unless target

    target.purge
    render json: { ok: true }
  end

  private

  # --- Setters -------------------------------------------------------

  def set_place_for_show
    if params[:include_deleted].present?
      place = Place.unscoped.find(params[:id])
      unless can_view_deleted_record?(place)
        head :forbidden and return
      end
      @place = place
    else
      # default_scope（未削除のみ）があるならこれでOK
      @place = Place.find(params[:id])
    end
  end

  def set_place
    @place = Place.find(params[:id])
  end

  # --- Pagination helper ---------------------------------------------

  def pagination_params
    page = params[:page].to_i
    per  = params[:per].to_i

    page = 1 if page <= 0
    per  = 50 if per <= 0
    per  = 200 if per > 200 # 上限を決めておく（DoS防止）

    [page, per]
  end

  # --- Base scopes ---------------------------------------------------

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

  # --- Auth helpers --------------------------------------------------

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

  # --- Strong params & attachments -----------------------------------

  def place_params
    params.require(:place).permit(
      :name,
      :description,
      :address_line,
      :city,
      :state,
      :postal_code,
      :country,
      :latitude,
      :longitude,
      :google_place_id,
      :phone,
      :website_url,
      :status
    )
  end

  def attach_photos(record)
    return unless params[:photos].present?

    Array(params[:photos]).each do |file|
      record.photos.attach(file)
    end
  end

  # update のときに渡ってくる photos_to_purge を解釈して purge する
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

  # --- JSON helpers --------------------------------------------------

  # 一覧用
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
      # ※ 一覧は現状どおり google_place_id を返さない（= マップのリンクは name+address で作る）
    }
  end

  # 詳細用（index よりリッチ）
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
      phone: place.phone,
      website_url: place.website_url,
      full_address: place.full_address,
      address: place.address, # ← V5 で index と揃えたやつ
      first_photo_url: first_photo_abs_url(place),
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

  # --- 検索 ----------------------------------------------------------

  # /places, /places/mine の q= に共通で使うフィルタ
  # PostgreSQL のときは pg_trgm / full_address_cached を活かしてソートも掛ける
  # SQLite/MySQL では LIKE フォールバック
  def apply_text_search(scope, q)
    adapter   = ActiveRecord::Base.connection.adapter_name.downcase
    is_pg     = adapter.include?('postgres')
    is_sqlite = adapter.include?('sqlite')

    if is_pg
      has_cached   = Place.column_names.include?('full_address_cached')
      address_expr = if has_cached
                       'places.full_address_cached'
                     else
                       "concat_ws(' ', places.address_line, places.city, places.state, places.postal_code, places.country)"
                     end

      safe    = ActiveRecord::Base.sanitize_sql_like(q)
      pattern = "%#{safe}%"

      where_sql = <<~SQL.squish
        places.name ILIKE :p
        OR places.city ILIKE :p
        OR places.description ILIKE :p
        OR #{address_expr} ILIKE :p
      SQL

      scope = scope.where(where_sql, p: pattern)

      order_sql =
        if has_cached
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
      # SQLite / MySQL フォールバック
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

      where_sql = []
      binds = []

      where_sql << "#{name_col} LIKE ?";  binds << pattern
      where_sql << "#{city_col} LIKE ?";  binds << pattern
      where_sql << "#{desc_col} LIKE ?";  binds << pattern
      where_sql << "#{concat_sql} LIKE ?"; binds << pattern

      scope.where(where_sql.join(' OR '), *binds)
    end
  end

  # --- サジェスト生成 ------------------------------------------------

  def build_suggestions(scope, q, limit:)
    lim = limit.present? ? limit.to_i.clamp(1, 20) : 8

    adapter   = ActiveRecord::Base.connection.adapter_name.downcase
    is_pg     = adapter.include?('postgres')
    is_sqlite = adapter.include?('sqlite')

    if is_pg
      has_cached   = Place.column_names.include?('full_address_cached')
      address_expr = if has_cached
                       'places.full_address_cached'
                     else
                       "concat_ws(' ', places.address_line, places.city, places.state, places.postal_code, places.country)"
                     end

      safe    = ActiveRecord::Base.sanitize_sql_like(q)
      pattern = "%#{safe}%"

      where_sql = <<~SQL.squish
        places.name ILIKE :p
        OR places.city ILIKE :p
        OR places.description ILIKE :p
        OR #{address_expr} ILIKE :p
      SQL

      order_sql =
        if has_cached
          ActiveRecord::Base.send(
            :sanitize_sql_array,
            [
              "GREATEST(similarity(places.name, ?),
                        similarity(places.city, ?),
                        similarity(places.description, ?),
                        similarity(#{address_expr}, ?)) DESC,
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

      rows = scope
               .where(where_sql, p: pattern)
               .select("places.name, places.city, #{address_expr} AS full_addr")
               .reorder(Arel.sql(order_sql))
               .limit(50)

      pool = []
      rows.each do |r|
        [r.name, r.city, r.try(:full_addr)].each do |v|
          pool << v unless v.blank?
        end
      end

      qd = q.downcase
      uniq = []
      seen = {}

      pool.each do |v|
        next if seen[v]

        seen[v] = true
        uniq << v
      end

      contains = uniq.select { |v| v.downcase.include?(qd) }
      others   = uniq.reject { |v| v.downcase.include?(qd) }

      (contains + others).take(lim)
    else
      # SQLite / MySQL
      safe    = ActiveRecord::Base.sanitize_sql_like(q.downcase)
      pattern = "%#{safe}%"

      concat_sql =
        if is_sqlite
          "LOWER(COALESCE(places.address_line,'') || ' ' || COALESCE(places.city,'') || ' ' || COALESCE(places.state,'') || ' ' || COALESCE(places.postal_code,'') || ' ' || COALESCE(places.country,''))"
        else
          "LOWER(CONCAT_WS(' ', places.address_line, places.city, places.state, places.postal_code, places.country))"
        end

      where_sql = <<~SQL.squish
        LOWER(places.name) LIKE :p
        OR LOWER(places.city) LIKE :p
        OR LOWER(places.description) LIKE :p
        OR #{concat_sql} LIKE :p
      SQL

      rows = scope
               .where(where_sql, p: pattern)
               .select("places.name, places.city, CONCAT_WS(' ', places.address_line, places.city, places.state, places.postal_code, places.country) AS full_addr")
               .order(created_at: :desc)
               .limit(50)

      pool = []
      rows.each do |r|
        [r.name, r.city, r.try(:full_addr)].each do |v|
          pool << v unless v.blank?
        end
      end

      pool.uniq.take(lim)
    end
  end
end
