// 新規投稿ページ（/place/new 想定）
// 依存: src/lib/api.js の createPlace / createPlaceWithPhotos / getToken

import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../使う、参考/components/layout/AppHeader";
import AppFooter from "../使う、参考/components/layout/AppFooter";
import { createPlace, createPlaceWithPhotos, getToken } from "../lib/api";

export default function Post() {
  const authed = !!(getToken() || localStorage.getItem("token"));

  // ---- フォーム状態 ----
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [status, setStatus] = useState("");

  const [files, setFiles] = useState([]); // File[]
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const fileInputRef = useRef(null);
  const descRef = useRef(null);

  // ---- Textarea autosize ----
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  // ---- 画像プレビュー ----
  const previews = useMemo(
    () =>
      files.map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        size: f.size,
      })),
    [files]
  );
  useEffect(() => {
    // revoke
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  function onPickFiles(e) {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    setFiles((prev) => [...prev, ...list]);
    // reset to allow same file reselect
    e.target.value = "";
  }
  function removeFileByIndex(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setErr("");

    // 簡易バリデーション
    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      address_line: addressLine.trim(),
      city: city.trim(),
      state: state.trim(),
      postal_code: postalCode.trim(),
      country: country.trim(),
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      phone: phone.trim(),
      website_url: websiteUrl.trim(),
      status: status.trim(),
    };

    setSubmitting(true);
    try {
      let created = null;

      if (files.length > 0) {
        created = await createPlaceWithPhotos(payload, files);
      } else {
        created = await createPlace(payload);
      }

      // 正常なら詳細へ。id が無ければマイページへ
      const id = created?.id;
      if (id) {
        location.assign(`/places/${id}`);
      } else {
        location.assign(`/mypage`);
      }
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Post a new place</h1>
        </header>

        {/* 未ログインの案内 */}
        {!authed && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="mb-2 font-medium">投稿するにはサインインが必要です。</p>
            <p className="text-sm text-slate-600">
              My Page と Post を利用するには、アカウントを登録してサインインしてください。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Sign up
              </a>
              <a
                href="/login"
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                Log in
              </a>
              <a
                href="/place-homepage"
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                ホームを見る
              </a>
            </div>
          </div>
        )}

        {/* ログイン済みならフォーム表示 */}
        {authed && (
          <form onSubmit={onSubmit} className="space-y-5">
            {err && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {err}
              </div>
            )}

            {/* 基本情報 */}
            <section className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border p-2"
                  placeholder="Place name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">Description</label>
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full resize-none overflow-hidden rounded-md border p-2"
                  rows={3}
                  placeholder="Write details…"
                />
              </div>
            </section>

            {/* 住所 */}
            <section className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Address line</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="mt-1 w-full rounded-md border p-2"
                  placeholder="Street, building, etc."
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-600">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Postal code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-600">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
              </div>
            </section>

            {/* 連絡/URL/ステータス */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-600">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border p-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="mt-1 w-full rounded-md border p-2"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Status</label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-md border p-2"
                  placeholder="open/closed/etc."
                />
              </div>
            </section>

            {/* 写真（複数可） */}
            <section className="space-y-2">
              <label className="block text-sm text-gray-600">Photos</label>
              <div className="flex flex-wrap gap-3">
                {previews.map((p, idx) => (
                  <div
                    key={`${p.name}-${idx}`}
                    className="relative h-24 w-32 overflow-hidden rounded-md border"
                  >
                    {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                    <img src={p.url} alt={`photo ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFileByIndex(idx)}
                      className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-32 items-center justify-center rounded-md border border-dashed text-sm hover:bg-gray-50"
                >
                  + Add
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickFiles}
                />
              </div>
            </section>

            {/* Sticky 保存バー */}
            <div className="sticky bottom-16 z-40 mt-8 border-t bg-white/80 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <div className="flex items-center justify-end gap-3">
                <a
                  href="/place-homepage"
                  className="rounded-md border px-4 py-2 text-sm font-medium"
                >
                  ← Back to Home
                </a>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {submitting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      <AppFooter />
    </>
  );
}
