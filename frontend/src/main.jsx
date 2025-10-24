// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";


import PlacesHomepage from "./使う、参考/pages/PlacesHomepage.jsx";

/* ===== 開発用: Vite の env をブラウザ(console)で確認できるようにする =====
   テストが終わったら削除してOK（本番では残さない） */
if (import.meta.env?.DEV) {
  // eslint-disable-next-line no-underscore-dangle
  window.__ENV__ = import.meta.env;
  // eslint-disable-next-line no-underscore-dangle
  window.__MAPS_KEY__ = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY;
  // 目視確認
  // console.log("[ENV dump]", window.__ENV__);
  // console.log("[Maps key exists?]", !!window.__MAPS_KEY__);
}
/* ================================================================== */

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/place-homepage" element={<PlacesHomepage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
