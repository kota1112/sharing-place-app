let loadingPromise = null;

export function loadGoogleMaps(apiKey) {
  if (window.google && window.google.maps) return Promise.resolve();

  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=quarterly`;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Google Maps script"));
      document.head.appendChild(s);
    });
  }
  return loadingPromise;
}
