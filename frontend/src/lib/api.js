// src/lib/api.js
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

/* =========================
 * JWT token helpers
 * ========================= */
export function setToken(t) { localStorage.setItem("token", t); }
export function getToken()  { return localStorage.getItem("token"); }
export function clearToken(){ localStorage.removeItem("token"); }

/* =========================
 * 共通API呼び出し
 * - JSON/Multipart 両対応（body or formData のどちらかを渡す）
 * - Authorization: Bearer <JWT> を自動付与
 * - タイムアウト（既定 15s）
 * - 204 は null
 * ========================= */
export async function api(
  path,
  { method = "GET", body, formData, headers: extraHeaders } = {},
  { timeoutMs = 15000 } = {}
) {
  const token = getToken();
  const headers = { Accept: "application/json", ...(extraHeaders || {}) };

  // multipart 以外は JSON として送信
  let fetchBody;
  if (formData) {
    fetchBody = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: fetchBody, signal: ctrl.signal });
  } catch (e) {
    clearTimeout(tid);
    throw new Error(`Network error or timeout: ${e?.message || e}`);
  } finally {
    clearTimeout(tid);
  }

  if (res.ok) {
    if (res.status === 204) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await res.json();
    return await res.text();
  }

  const text = await res.text().catch(() => "");
  let msg = `HTTP ${res.status} ${res.statusText}`;
  if (text) {
    try { msg += ` :: ${JSON.stringify(JSON.parse(text))}`; }
    catch { msg += ` :: ${text}`; }
  }
  throw new Error(msg);
}

/* =========================================================
 * Places API ラッパ（バックエンドの最新仕様に対応）
 * ========================================================= */

// 自分の一覧（?with_deleted=1 / ?only_deleted=1 も可）
export async function getMyPlaces(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/places/mine${qs ? `?${qs}` : ""}`);
}

// 公開一覧（管理者は ?with_deleted=1 可）
export async function searchPlaces(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/places${qs ? `?${qs}` : ""}`);
}

// 詳細（削除済みも取るなら include_deleted=1）
export async function getPlace(id, { includeDeleted = false } = {}) {
  const qs = includeDeleted ? "?include_deleted=1" : "";
  return api(`/places/${id}${qs}`);
}

// 作成（JSON）
export async function createPlace(payload) {
  return api(`/places`, { method: "POST", body: { place: payload } });
}

// 作成＋写真（multipart）
export async function createPlaceWithPhotos(payload, files = []) {
  const fd = new FormData();
  fd.append("place[name]", payload.name ?? "");
  if (payload.description != null) fd.append("place[description]", payload.description);
  [
    "address_line","city","state","postal_code","country",
    "latitude","longitude","google_place_id","phone","website_url","status",
  ].forEach((k) => payload[k] != null && fd.append(`place[${k}]`, payload[k]));
  files.forEach((f) => fd.append("photos[]", f));
  return api(`/places`, { method: "POST", formData: fd });
}

// 更新（JSON）
export async function updatePlace(id, payload) {
  return api(`/places/${id}`, { method: "PATCH", body: { place: payload } });
}

/**
 * 更新＋写真（multipart）
 * - 新規追加ファイル: files[]
 * - 既存写真の削除: removeIds[] を photos_to_purge[] として送信（オプション）
 */
export async function updatePlaceWithPhotos(id, payload, files = [], removeIds = []) {
  const fd = new FormData();
  fd.append("place[name]", payload.name ?? "");
  if (payload.description != null) fd.append("place[description]", payload.description);
  [
    "address_line","city","state","postal_code","country",
    "latitude","longitude","google_place_id","phone","website_url","status",
  ].forEach((k) => payload[k] != null && fd.append(`place[${k}]`, payload[k]));

  files.forEach((f) => fd.append("photos[]", f));
  removeIds.forEach((pid) => fd.append("photos_to_purge[]", pid)); // optional

  return api(`/places/${id}`, { method: "PATCH", formData: fd });
}

/**
 * 写真の削除（単体）
 * - 使い方:
 *    deletePlacePhoto(placeId, blobId)           // blob(attachment) ID 指定で削除
 *    deletePlacePhoto(placeId, imageUrl)         // URL 指定で削除（サーバで照合）
 * - バックエンド側ルート例:
 *    DELETE /places/:id/photos/:photo_id
 *    POST   /places/:id/delete_photo   { url: "..." }
 */
export async function deletePlacePhoto(placeId, photoIdOrUrl) {
  // 数字・数値文字列なら ID とみなす
  const isId =
    typeof photoIdOrUrl === "number" ||
    (typeof photoIdOrUrl === "string" && /^\d+$/.test(photoIdOrUrl));

  if (isId) {
    const pid = String(photoIdOrUrl);
    return api(`/places/${placeId}/photos/${pid}`, { method: "DELETE" });
  }
  // URLで送る（JSON）
  return api(`/places/${placeId}/delete_photo`, {
    method: "POST",
    body: { url: String(photoIdOrUrl) },
  });
}

// ソフトデリート
export async function deletePlaceSoft(id) {
  return api(`/places/${id}`, { method: "DELETE" });
}

// 復元
export async function restorePlace(id) {
  return api(`/places/${id}/restore`, { method: "POST" });
}

// 完全削除（管理者のみ）
export async function hardDeletePlace(id) {
  return api(`/places/${id}/hard_delete`, { method: "DELETE" });
}

// サジェスト
export async function suggestAll(q, limit = 8) {
  const qs = new URLSearchParams({ q, limit }).toString();
  return api(`/places/suggest?${qs}`);
}
export async function suggestMine(q, limit = 8) {
  const qs = new URLSearchParams({ q, limit }).toString();
  return api(`/places/suggest_mine?${qs}`);
}

/* ===== プロフィール（互換ユーティリティ） ===== */
export async function getMe() {
  return api(`/auth/me`);
}
