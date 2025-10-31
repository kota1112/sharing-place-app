// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import PlacesHomepage from "./pages/PlacesHomepage.jsx";
import PlaceNew from "./pages/PlaceNew.jsx";
import LogIn from "./pages/LogIn.jsx";
import PlacesIndex from "./pages/PlacesIndex.jsx";
import PlaceDetail from "./pages/PlaceDetail.jsx";
import MyPage from "./pages/MyPage.jsx";
import PlaceEditPage from "./pages/PlaceEditPage.jsx";
import SignUp from "./pages/SignUp.jsx";
import Post from "./pages/Post.jsx";
import AccountConnections from "./pages/AccountConnections.jsx";
import AccountSettings from "./pages/AccountSettings.jsx";

/**
 * 方法B: パッケージを入れずに CDN から markerclusterer を読む
 * - すでに読み込んであったら何もしない
 * - 読み込めたら window.MarkerClusterer にぶら下げる
 */
function ensureMarkerClustererOnWindow() {
  if (typeof window === "undefined") return;

  // もうあれば何もしない
  if (window.MarkerClusterer) return;

  // unpkg で公開されているバンドルを使う
  const script = document.createElement("script");
  script.src =
    "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js";
  script.async = true;
  script.onload = () => {
    // CDN 版は window.markerClusterer 名前空間で出てくる
    if (window.markerClusterer?.MarkerClusterer) {
      window.MarkerClusterer = window.markerClusterer.MarkerClusterer;
      // console.log("[main] MarkerClusterer loaded from CDN");
    }
  };
  script.onerror = () => {
    // 読み込み失敗してもアプリは続行する（MapView 側でフォールバックする）
    // console.warn("[main] failed to load markerclusterer from CDN");
  };
  document.head.appendChild(script);
}

// ブラウザで実行されるときだけ仕込む
ensureMarkerClustererOnWindow();

// /* ===== 開発用: Vite の env をブラウザ(console)で確認できるようにする =====
// if (import.meta.env?.DEV) {
//   window.__ENV__ = import.meta.env;
//   window.__MAPS_KEY__ = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY;
// }
 // /* ================================================================== */

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/place-homepage" element={<PlacesHomepage />} />
        {/* ← ここ、元から "//places/:id" になってたのでそのままにしてあります */}
        <Route path="//places/:id" element={<PlaceDetail />} />
        <Route path="/place/new" element={<Post />} />
        <Route path="/places/:id/edit" element={<PlaceEditPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/account/settings" element={<AccountSettings />} />
        <Route path="/account/connections" element={<AccountConnections />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/index" element={<PlacesIndex />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
