// src/pages/PlaceEditPage.jsx
// /* global File */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader";
import AppFooter from "../components/layout/AppFooter";
import {
  getPlace,
  updatePlace,
  updatePlaceWithPhotos,
  deletePlacePhoto, // あれば利用（無ければ try 内で無視）
} from "../lib/api";

/* ---- Textarea 自動リサイズ ---- */
function useAutosizeTextArea(ref, value) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [ref, value]);
}

export default function PlaceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    address_line: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
    website_url: "",
    latitude: "",
    longitude: "",
    google_place_id: "",
  });

  const [photos, setPhotos] = useState([]); // [{url, key}]
  const [newFiles, setNewFiles] = useState([]); // File[]

  // 説明の自動リサイズ
  const descRef = useRef(null);
  useAutosizeTextArea(descRef, form.description);

  // 初期ロード
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await getPlace(id, { includeDeleted: true });
        if (aborted) return;

        setForm({
          name: data.name || "",
          description: data.description || "",
          address_line: data.address_line || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          country: data.country || "",
          phone: data.phone || "",
          website_url: data.website_url || "",
          latitude: data.latitude ?? "",
          longitude: data.longitude ?? "",
          google_place_id: data.google_place_id || "",
        });

        setPhotos(
          (data.photo_urls || []).map((url, idx) => ({
            url,
            key: `${idx}-${url}`,
          }))
        );
      } catch (e) {
        if (!aborted) setErr(e?.message || String(e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [id]);

  function onChange(field, v) {
    setForm((s) => ({ ...s, [field]: v }));
  }

  function onPickFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setNewFiles((prev) => prev.concat(files));
      e.target.value = ""; // 次回の選択でも change が発火するように
    }
  }

  async function onDeletePhoto(urlOrId) {
    try {
      if (typeof deletePlacePhoto === "function") {
        await deletePlacePhoto(id, urlOrId);
      }
      setPhotos((list) =>
        list.filter((p) => p.url !== urlOrId && p.key !== urlOrId)
      );
    } catch (e) {
      alert(`写真の削除に失敗しました: ${e?.message || e}`);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setErr("");

      if (newFiles.length > 0) {
        await updatePlaceWithPhotos(id, form, newFiles);
      } else {
        await updatePlace(id, form);
      }

      navigate(`/mypage`);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const canSave = useMemo(() => !!form.name?.trim(), [form.name]);

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-28">
        {/* ← Back（詳細ページと同じ位置・上部） */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            ← Back
          </button>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-bold">場所を編集</h1>
          <div className="mt-1 text-sm text-gray-500">
            ID: <span className="font-mono">{id}</span>
          </div>
        </header>

        {loading && <p className="text-gray-500">読み込み中…</p>}
        {!loading && err && <p className="text-red-600">エラー: {err}</p>}

        {!loading && !err && (
          <form onSubmit={onSubmit} className="space-y-6">
            {/* 現在の写真 */}
            <section>
              <div className="mb-2 text-sm font-medium">現在の写真</div>
              {photos.length === 0 ? (
                <p className="text-gray-500">まだありません。</p>
              ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {photos.map((p) => (
                    <li key={p.key || p.url} className="rounded-xl border">
                      <div className="relative">
                        <img
                          src={p.url}
                          alt=""
                          className="h-48 w-full rounded-t-xl object-cover"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                        <button
                          type="button"
                          onClick={() => onDeletePhoto(p.url)}
                          className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-red-600 shadow hover:bg-white"
                          title="削除"
                        >
                          削除
                        </button>
                      </div>
                      <div className="truncate px-3 py-2 text-xs text-gray-500">
                        {p.url}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 追加アップロード */}
            <section>
              <div className="mb-2 text-sm font-medium">
                写真を追加（複数可）
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onPickFiles}
              />
              {newFiles.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  追加予定: {newFiles.map((f) => f.name).join(", ")}
                </div>
              )}
            </section>

            {/* 基本情報 */}
            <section className="grid grid-cols-1 gap-4">
              <input
                className="rounded-lg border px-3 py-2"
                placeholder="名前"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                required
              />

              {/* 説明：自動リサイズ */}
              <textarea
                ref={descRef}
                className="min-h-[96px] w-full resize-none rounded-lg border px-3 py-2"
                placeholder="説明"
                value={form.description}
                onChange={(e) => onChange("description", e.target.value)}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="住所1（番地・通り）"
                  value={form.address_line}
                  onChange={(e) => onChange("address_line", e.target.value)}
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="市区町村"
                  value={form.city}
                  onChange={(e) => onChange("city", e.target.value)}
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="都道府県"
                  value={form.state}
                  onChange={(e) => onChange("state", e.target.value)}
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="郵便番号"
                  value={form.postal_code}
                  onChange={(e) => onChange("postal_code", e.target.value)}
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="国"
                  value={form.country}
                  onChange={(e) => onChange("country", e.target.value)}
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="Webサイト"
                  value={form.website_url}
                  onChange={(e) => onChange("website_url", e.target.value)}
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="電話番号"
                  value={form.phone}
                  onChange={(e) => onChange("phone", e.target.value)}
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="緯度"
                  value={form.latitude ?? ""}
                  onChange={(e) => onChange("latitude", e.target.value)}
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  placeholder="経度"
                  value={form.longitude ?? ""}
                  onChange={(e) => onChange("longitude", e.target.value)}
                />
              </div>
            </section>

            {/* 固定アクションバー（保存） */}
            <div className="sticky bottom-0 left-0 right-0 z-10 -mx-4 border-t bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70">
              <div className="mx-auto flex max-w-4xl items-center justify-end gap-3">
                {err && (
                  <span className="truncate text-sm text-red-600">{err}</span>
                )}
                <button
                  type="submit"
                  disabled={!canSave || saving}
                  className={
                    "rounded-lg px-4 py-2 text-white transition " +
                    (canSave && !saving
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "cursor-not-allowed bg-gray-400")
                  }
                >
                  {saving ? "保存中…" : "保存する"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
      <AppFooter />
    </>
  );
}
