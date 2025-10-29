import React, { useEffect, useState } from 'react';
import { getPlace, updatePlace, updatePlaceWithPhotos } from '../../lib/api';
import { useNavigate, useParams } from 'react-router-dom';

export default function PlaceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [place, setPlace] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        // 削除済みでも読み込めるよう include_deleted=1
        const data = await getPlace(id, { includeDeleted: true });
        if (!aborted) setPlace(data);
      } catch (e) {
        alert(`読み込みに失敗しました: ${e.message}`);
      } finally {
        !aborted && setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [id]);

  const onChange = (k, v) => setPlace((prev) => ({ ...prev, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
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
        status: place.status,
      };
      if (files.length > 0) {
        await updatePlaceWithPhotos(id, payload, files);
      } else {
        await updatePlace(id, payload);
      }
      alert('保存しました');
      navigate('/mypage');
    } catch (e) {
      alert(`保存に失敗しました: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">読み込み中…</div>;
  if (!place) return <div className="p-6">データが見つかりません</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200">戻る</button>
        <h1 className="text-xl font-bold">場所を編集</h1>
        {place.deleted_at && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">削除済み</span>}
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border p-5 flex flex-col gap-4">
        <Field label="名前">
          <input className="input" value={place.name || ''} onChange={(e) => onChange('name', e.target.value)} required />
        </Field>
        <Field label="説明">
          <textarea className="input h-28" value={place.description || ''} onChange={(e) => onChange('description', e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="住所1">
            <input className="input" value={place.address_line || ''} onChange={(e) => onChange('address_line', e.target.value)} />
          </Field>
          <Field label="市区町村">
            <input className="input" value={place.city || ''} onChange={(e) => onChange('city', e.target.value)} />
          </Field>
          <Field label="都道府県">
            <input className="input" value={place.state || ''} onChange={(e) => onChange('state', e.target.value)} />
          </Field>
          <Field label="郵便番号">
            <input className="input" value={place.postal_code || ''} onChange={(e) => onChange('postal_code', e.target.value)} />
          </Field>
          <Field label="国">
            <input className="input" value={place.country || ''} onChange={(e) => onChange('country', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="緯度">
            <input className="input" type="number" step="any" value={place.latitude ?? ''} onChange={(e) => onChange('latitude', e.target.value)} />
          </Field>
          <Field label="経度">
            <input className="input" type="number" step="any" value={place.longitude ?? ''} onChange={(e) => onChange('longitude', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="電話番号">
            <input className="input" value={place.phone || ''} onChange={(e) => onChange('phone', e.target.value)} />
          </Field>
          <Field label="WebサイトURL">
            <input className="input" value={place.website_url || ''} onChange={(e) => onChange('website_url', e.target.value)} />
          </Field>
        </div>

        <Field label="写真（追加）">
          <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        </Field>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl border hover:bg-gray-50">キャンセル</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
      <style>{`.input{width:100%;border:1px solid #e5e7eb;border-radius:0.75rem;padding:0.625rem 0.875rem;}`}</style>
    </label>
  );
}
