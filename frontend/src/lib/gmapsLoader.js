// src/lib/gmapsLoader.js
let _once;

export function ensureGoogleMapsLoaded(apiKey) {
  // すでに読み込み済みなら即resolve
  if (window.google?.maps) return Promise.resolve();

  // 1回だけscriptタグを挿す
  if (!_once) {
    _once = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      s.async = true;
      s.onerror = () => reject(new Error("Failed to load Google Maps"));
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }
  return _once;
}
