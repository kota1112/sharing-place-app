// src/api.js
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

// ---- JWT token helpers ----
export function setToken(t) { localStorage.setItem("token", t); }
export function getToken()  { return localStorage.getItem("token"); }
export function clearToken(){ localStorage.removeItem("token"); }

/**
 * 共通API呼び出し
 * - JSON/Multipart 両対応（body か formData のどちらかを渡す）
 * - Authorization: Bearer <JWT> を自動付与
 * - タイムアウト付き（デフォ 15s）
 * - 204はnull返す
 * 例:
 *   api('/places')                               // GET JSON
 *   api('/auth/sign_in',{ method:'POST', body:{ user:{...} } })
 *   api('/places',{ method:'POST', formData: fd }) // 画像アップ
 */
export async function api(
  path,
  { method = "GET", body, formData, headers: extraHeaders } = {},
  { timeoutMs = 15000 } = {}
) {
  const token = getToken();
  const headers = { Accept: "application/json", ...(extraHeaders || {}) };

  // JSON のときだけ Content-Type を自前で付ける（multipartはブラウザが境界線を付与するため付けない）
  let fetchBody;
  if (formData) {
    fetchBody = formData; // Content-Type は自動
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
    // タイムアウトやネットワーク断など
    throw new Error(`Network error or timeout: ${e?.message || e}`);
  } finally {
    clearTimeout(tid);
  }

  // 成功時の応答
  if (res.ok) {
    if (res.status === 204) return null; // No Content
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      return await res.json();
    }
    return await res.text();
  }

  // 失敗時は本文付きで詳細化
  const text = await res.text().catch(() => "");
  let msg = `HTTP ${res.status} ${res.statusText}`;
  if (text) {
    // JSONなら整形して載せる
    try {
      const j = JSON.parse(text);
      msg += ` :: ${JSON.stringify(j)}`;
    } catch {
      msg += ` :: ${text}`;
    }
  }
  throw new Error(msg);
}
