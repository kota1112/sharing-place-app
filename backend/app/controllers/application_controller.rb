# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  # ここはAPI専用アプリとしてのベースクラスのままにしておきます。
  # 既存のコントローラ（PlacesController や Users::SessionsController など）は
  # いままで通りこの ApplicationController を継承すれば動きます。

  private

  #
  # 共通ページネーション
  #
  # - ?page= や ?per= が無いときは page=1, per=50 に揃えます
  # - 悪意ある or 間違った値（0, マイナス, 文字列）は安全側に倒します
  # - サーバーの上限は per=200 としておきます（リスト/グリッド用の現実的な値）
  #
  # 各コントローラではこんな感じで使えます：
  #
  #   page, per = pagination_params
  #   places = Place.recent.page(page).per(per)
  #
  # kaminari/pagy 未導入でも、単純な offset/limit にも使えます：
  #
  #   page, per = pagination_params
  #   records = scope.offset((page - 1) * per).limit(per)
  #
  def pagination_params
    # page
    page = params[:page].to_i
    page = 1 if page <= 0

    # per
    per = params[:per].to_i
    per = 50 if per <= 0          # デフォルト
    per = 200 if per > 200        # サーバ側の上限（必要ならここを変える）

    [page, per]
  end

  #
  # マップ用の共通パラメータ
  #
  # /places/map?nelat=...&nelng=...&swlat=...&swlng=...&zoom=...
  # みたいなリクエストを Rails 側で毎回手で .to_f するのはだるいので、
  # ApplicationController に寄せておきます。
  #
  # 使い方：
  #
  #   bounds = map_bounds_params
  #   # bounds[:ne_lat], bounds[:ne_lng], ... が Float / nil で入ってる
  #
  # nil のままでもいいようにコントローラ側でフォールバックを書けばOKです。
  #
  def map_bounds_params
    {
      ne_lat: params[:nelat].present? ? params[:nelat].to_f : nil,
      ne_lng: params[:nelng].present? ? params[:nelng].to_f : nil,
      sw_lat: params[:swlat].present? ? params[:swlat].to_f : nil,
      sw_lng: params[:swlng].present? ? params[:swlng].to_f : nil,
      zoom:   params[:zoom].present?  ? params[:zoom].to_i  : nil
    }
  end

  #
  # 将来、一覧レスポンスを
  #   { data: [...], meta: { page: ..., per: ..., total: ... } }
  # という形に揃えたいときのための小さなヘルパ。
  # いまはどのコントローラからも呼ばれていないので、既存の挙動は壊しません。
  #
  # 例：
  #   page, per = pagination_params
  #   records    = scope.offset((page - 1) * per).limit(per)
  #   render_collection(records, page: page, per: per, total: scope.count)
  #
  def render_collection(records, page:, per:, total:)
    render json: {
      data: records,
      meta: {
        page: page,
        per:  per,
        total: total
      }
    }
  end
end
