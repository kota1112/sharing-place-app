// src/lib/maps.js
let loadingPromise = null;

export function loadMaps({ apiKey, mapId } = {}) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loadingPromise) return loadingPromise;

  if (!apiKey) apiKey = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY;
  const url = new URL("https://maps.googleapis.com/maps/api/js");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("v", "weekly");
  // Advanced Marker等を使うなら
  url.searchParams.set("libraries", "marker");
  // パフォーマンス最適（Google推奨の functional API）
  url.searchParams.set("loading", "async");

  loadingPromise = new Promise((resolve, reject) => {
    const cb = "__initMaps_" + Math.random().toString(36).slice(2);
    window[cb] = () => {
      resolve(window.google.maps);
      delete window[cb];
    };
    url.searchParams.set("callback", cb);

    const s = document.createElement("script");
    s.src = url.toString();
    s.async = true;
    s.onerror = (e) => reject(new Error("Failed to load Google Maps JS API."));
    document.head.appendChild(s);
  });

  return loadingPromise;
}
