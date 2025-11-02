// src/lib/api.js
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

/* =========================
 * JWT token helpers
 * ========================= */
export function setToken(t) {
  localStorage.setItem("token", t);
}
export function getToken() {
  return localStorage.getItem("token");
}
export function clearToken() {
  localStorage.removeItem("token");
}

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
 * - JSON/Multipart 両対応
 * - Authorization: Bearer <JWT> を自動付与
 * - タイムアウト（15s）
 * - 204 は null
 * ========================= */
export async function api(
  path,
  { method = "GET", body, formData, headers: extraHeaders } = {},
  { timeoutMs = 15000 } = {}
) {
  const token = getToken();
  const headers = { Accept: "application/json", ...(extraHeaders || {}) };

  let fetchBody;
  if (formData) {
    // multipart
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
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: fetchBody,
      signal: ctrl.signal,
    });
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
    try {
      msg += ` :: ${JSON.stringify(JSON.parse(text))}`;
    } catch {
      msg += ` :: ${text}`;
    }
  }
  throw new Error(msg);
}

/* =========================================================
 * Auth API
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
  try {
    data = await res.clone().json();
  } catch {
    // ignore
  }

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
  try {
    data = await res.clone().json();
  } catch {
    // ignore
  }

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

/* ===== Google を後から紐づける／外す ===== */

// 今ログインしてるユーザーに Google を紐づけ
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

/* ===== パスワード関連（追加） ===== */

// ① 通常のパスワードリセット（サーバ側の /auth/password が実装されている想定）
export async function requestPasswordReset(email) {
  const res = await fetch(`${BASE}/auth/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Reset email failed");
  }
  return data;
}

// ② Google連携ユーザー向けリセット（routes.rbで生やしたやつ）
export async function requestGooglePasswordReset(email) {
  const res = await fetch(`${BASE}/auth/password/forgot_via_google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Reset via Google failed");
  }
  return data;
}

/* =========================================================
 * Places API ラッパ
 * ========================================================= */

/**
 * 公開一覧（新）: ページネーション対応
 * GET /places?page=1&per=50&q=...
 * Rails 側は { data: [...], meta: { page, per, total, total_pages } } を返す
 */
export async function fetchPlaces({ page = 1, per = 50, q = "" } = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("per", per);
  if (q) params.set("q", q);
  return api(`/places?${params.toString()}`);
}

/**
 * 自分の一覧（新）: ページネーション対応
 * GET /places/mine?page=1&per=50&q=...
 */
export async function fetchMyPlaces({ page = 1, per = 50, q = "" } = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("per", per);
  if (q) params.set("q", q);
  return api(`/places/mine?${params.toString()}`);
}

/**
 * 旧バージョンの呼び出しを残しておく（後方互換）
 * 返ってくるものは配列 or {data, meta} のどちらかなので
 * 呼び出し側が配列化して使う
 */
export async function getMyPlaces(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/places/mine${qs ? `?${qs}` : ""}`);
}
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
  if (payload.description != null)
    fd.append("place[description]", payload.description);
  [
    "address_line",
    "city",
    "state",
    "postal_code",
    "country",
    "latitude",
    "longitude",
    "google_place_id",
    "phone",
    "website_url",
    "status",
  ].forEach((k) => payload[k] != null && fd.append(`place[${k}]`, payload[k]));
  files.forEach((f) => fd.append("photos[]", f));
  return api(`/places`, { method: "POST", formData: fd });
}

// 更新（JSON）
export async function updatePlace(id, payload) {
  return api(`/places/${id}`, { method: "PATCH", body: { place: payload } });
}

// 更新＋写真（multipart）
export async function updatePlaceWithPhotos(
  id,
  payload,
  files = [],
  removeIds = []
) {
  const fd = new FormData();
  fd.append("place[name]", payload.name ?? "");
  if (payload.description != null)
    fd.append("place[description]", payload.description);
  [
    "address_line",
    "city",
    "state",
    "postal_code",
    "country",
    "latitude",
    "longitude",
    "google_place_id",
    "phone",
    "website_url",
    "status",
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

// サジェスト（公開）
export async function suggestAll(q, limit = 8) {
  const qs = new URLSearchParams({ q, limit }).toString();
  return api(`/places/suggest?${qs}`);
}
// サジェスト（自分の登録のみ）
export async function suggestMine(q, limit = 8) {
  const qs = new URLSearchParams({ q, limit }).toString();
  return api(`/places/suggest_mine?${qs}`);
}

/* ===== マップ専用API ===== */
/**
 * 1) Google Maps の bounds オブジェクトをそのまま渡すとき用
 *    const bounds = map.getBounds();
 *    fetchPlacesForMap({ bounds, zoom: map.getZoom(), q: searchTerm })
 */
export async function fetchPlacesForMap({ bounds, zoom, q } = {}) {
  const params = new URLSearchParams();
  if (bounds) {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    params.set("nelat", ne.lat());
    params.set("nelng", ne.lng());
    params.set("swlat", sw.lat());
    params.set("swlng", sw.lng());
  }
  if (zoom != null) params.set("zoom", zoom);
  if (q) params.set("q", q);
  // マップは多くても200件くらいにする（サーバ側でさらに min してOK）
  params.set("limit", "200");
  return api(`/places/map?${params.toString()}`);
}

/**
 * 2) 数値を自分で持ってるとき用（バックエンドの /places/map に合わせるだけ）
 */
export async function fetchPlacesForMapRaw({
  nelat,
  nelng,
  swlat,
  swlng,
  zoom,
  q = "",
  limit = 200,
} = {}) {
  const params = new URLSearchParams();
  if (nelat != null) params.set("nelat", nelat);
  if (nelng != null) params.set("nelng", nelng);
  if (swlat != null) params.set("swlat", swlat);
  if (swlng != null) params.set("swlng", swlng);
  if (zoom != null) params.set("zoom", zoom);
  if (q) params.set("q", q);
  if (limit) params.set("limit", limit);
  return api(`/places/map?${params.toString()}`);
}

/* ===== プロフィール ===== */
export async function getMe() {
  return api(`/auth/me`);
}

/* ===== アカウント更新 ===== */
export async function updateAccount(fields) {
  return api(`/auth`, {
    method: "PATCH",
    body: { user: fields },
  });
}
