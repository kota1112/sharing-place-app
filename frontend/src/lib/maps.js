// 一度だけ読み込むローダ。常に v=weekly を使う
let loaded;
export function ensureMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (loaded) return loaded;

  const key = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY;
  if (!key) throw new Error("VITE_GOOGLE_MAPS_JS_KEY missing");

  loaded = new Promise((resolve, reject) => {
    const cb = "__initMaps_" + Math.random().toString(36).slice(2);
    window[cb] = () => resolve();
    const s = document.createElement("script");
    // v=weekly を明示。loading=async でOK
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&v=weekly&loading=async&callback=${cb}`;
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  return loaded;
}
