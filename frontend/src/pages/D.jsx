import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";

const GMAPS_KEY = import.meta.env.VITE_GMAPS_KEY;

export default function D() {
  const { id } = useParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");
    api(`/places/${id}`, { signal: ac.signal })
      .then((data) => setPlace(data))
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [id]);

  const addressLine = useMemo(() => {
    if (!place) return "";
    const parts = [
      place.address_line,
      place.city,
      place.state,
      place.postal_code,
      place.country,
    ].filter(Boolean);
    return parts.join(", ");
  }, [place]);

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-10">Loading...</div>;
  if (err) return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-red-600">
      取得に失敗しました：<code className="text-xs">{err}</code>
    </div>
  );
  if (!place) return <div className="mx-auto max-w-5xl px-4 py-10">Not Found</div>;

  const leadPhoto =
    Array.isArray(place.photo_urls) && place.photo_urls.length > 0
      ? place.photo_urls[0]
      : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{place.name}</h1>
        <Link
          to="/"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← Back
        </Link>
      </header>

      {/* 画像 */}
      <section className="mb-6">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {leadPhoto ? (
            <img
              src={leadPhoto}
              alt={place.name}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-400">
              no photo
            </div>
          )}
        </div>
      </section>

      {/* 住所 */}
      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">住所</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-slate-800">{addressLine || "-"}</div>
        </div>
      </section>

      {/* Google Map */}
      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold">Map</h2>
        <MapEmbed
          lat={place.latitude}
          lng={place.longitude}
          address={addressLine}
          name={place.name}
        />
        {/* Google マップで開くリンク（任意） */}
        <div className="mt-2">
          <a
            className="text-blue-600 hover:underline text-sm"
            href={
              place.latitude && place.longitude
                ? `https://www.google.com/maps?q=${place.latitude},${place.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    addressLine || place.name
                  )}`
            }
            target="_blank"
            rel="noreferrer"
          >
            Google マップで開く ↗
          </a>
        </div>
      </section>
    </main>
  );
}

/**
 * Google Maps Embed API で地図を iframe 表示
 * - lat/lng があれば view モード（中心座標 + ズーム）
 * - 無ければ place 検索モード（住所や名称で検索）
 */
function MapEmbed({ lat, lng, address, name }) {
  if (!GMAPS_KEY) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        VITE_GMAPS_KEY が設定されていません。`.env` に API キーを入れて再起動してください。
      </div>
    );
  }

  const hasLatLng = typeof lat === "number" && typeof lng === "number";
  const src = hasLatLng
    ? `https://www.google.com/maps/embed/v1/view?key=${GMAPS_KEY}&center=${lat},${lng}&zoom=16&maptype=roadmap`
    : `https://www.google.com/maps/embed/v1/place?key=${GMAPS_KEY}&q=${encodeURIComponent(
        address || name || ""
      )}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <iframe
        title="Google Map"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[360px] w-full"
      />
    </div>
  );
}
