const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
export function setToken(t) {
  localStorage.setItem("token", t);
}
export function getToken() {
  return localStorage.getItem("token");
}
export function clearToken() {
  localStorage.removeItem("token");
}
export async function api(path, { method = "GET", body, formData } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!formData) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: formData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await res.json().catch(() => ({ error: res.statusText }));
  return res.headers.get("content-type")?.includes("application/json")
    ? res.json()
    : res.text();
}

