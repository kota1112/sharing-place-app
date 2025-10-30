// src/lib/api.js
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

/* =========================
 * JWT token helpers
 * ========================= */
export function setToken(t) { localStorage.setItem("token", t); }
export function getToken()  { return localStorage.getItem("token"); }
export function clearToken(){ localStorage.removeItem("token"); }

/* =========================
 * 内部ユーティリティ
 * ========================= */
// Devise-JWT は Authorization: Bearer <JWT> で返る前提
function extractJwtFromResponse(res) {
  const auth = res?.headers?.get?.("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

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
 * Auth API
 * 既存のメール/パスワードと Google の両方をサポート
 * ルート:
 *  - POST /auth/sign_in
 *  - DELETE /auth/sign_out
 *  - POST /auth/google       (OauthController#google)
 *  - POST /auth/link/google
 *  - DELETE /auth/link/google
 * ========================================================= */

// メール/パスワードでサインイン
export async function signIn(email, password) {
  const res = await fetch(`${BASE}/auth/sign_in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      "user[email]": email,
      "user[password]": password,
    }),
  });

  let data = {};
  try { data = await res.clone().json(); } catch {}

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Sign in failed");
  }

  const jwt = extractJwtFromResponse(res) || data?.token || data?.jwt;
  if (jwt) setToken(jwt);
  return data;
}

// サインアウト（JWT失効）
export async function signOut() {
  const token = getToken();
  try {
    await fetch(`${BASE}/auth/sign_out`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
  } finally {
    clearToken();
  }
}

// Google ログイン（id_token をサーバへ送る）
export async function googleLogin(idToken) {
  const res = await fetch(`${BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  let data = {};
  try { data = await res.clone().json(); } catch {}

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Google login failed");
  }

  const jwt = extractJwtFromResponse(res) || data?.token || data?.jwt;
  if (jwt) setToken(jwt);

  return {
    token: jwt || null,
    user: data?.user || null,
    raw: data,
  };
}

/* ===== ここから追加：あとで Google を紐づける／解除する ===== */

// 今ログインしてるユーザーのアカウントに Google を「後から」紐づける
export async function linkGoogle(idToken) {
  const res = await fetch(`${BASE}/auth/link/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${getToken() || ""}`,
    },
    body: JSON.stringify({ id_token: idToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Link failed");
  }
  return data;
}

// 今ログインしてるユーザーから Google を外す
export async function unlinkGoogle() {
  const res = await fetch(`${BASE}/auth/link/google`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getToken() || ""}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Unlink failed");
  }
  return data;
}

/* =========================================================
 * Places API ラッパ
 * ========================================================= */

// 自分の一覧
export async function getMyPlaces(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/places/mine${qs ? `?${qs}` : ""}`);
}

// 公開一覧
export async function searchPlaces(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/places${qs ? `?${qs}` : ""}`);
}

// 詳細
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

// 更新＋写真（multipart）
export async function updatePlaceWithPhotos(id, payload, files = [], removeIds = []) {
  const fd = new FormData();
  fd.append("place[name]", payload.name ?? "");
  if (payload.description != null) fd.append("place[description]", payload.description);
  [
    "address_line","city","state","postal_code","country",
    "latitude","longitude","google_place_id","phone","website_url","status",
  ].forEach((k) => payload[k] != null && fd.append(`place[${k}]`, payload[k]));

  files.forEach((f) => fd.append("photos[]", f));
  removeIds.forEach((pid) => fd.append("photos_to_purge[]", pid));

  return api(`/places/${id}`, { method: "PATCH", formData: fd });
}

// 写真の削除（単体）
export async function deletePlacePhoto(placeId, photoIdOrUrl) {
  const isId =
    typeof photoIdOrUrl === "number" ||
    (typeof photoIdOrUrl === "string" && /^\d+$/.test(photoIdOrUrl));

  if (isId) {
    const pid = String(photoIdOrUrl);
    return api(`/places/${placeId}/photos/${pid}`, { method: "DELETE" });
  }
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

// 完全削除
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

/* ===== プロフィール ===== */
export async function getMe() {
  return api(`/auth/me`);
}

/* ===== アカウント更新（新規追加） ===== */
/**
 * アカウント設定ページから使う想定のAPI
 * fields: {
 *   email?, display_name?, username?,
 *   current_password?, password?, password_confirmation?
 * }
 */
export async function updateAccount(fields) {
  return api(`/auth`, {
    method: "PATCH",
    body: { user: fields },
  });
}
