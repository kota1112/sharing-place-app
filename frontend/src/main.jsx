import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import App from "./App.jsx"; // ← 追加
import PlacesIndex from "./pages/PlacesIndex.jsx";
import PlaceNew from "./pages/PlaceNew.jsx";
import Home from "./pages/Home.jsx";
import MyPage from "./pages/MyPage.jsx";
import SinUp from "./pages/SinUp.jsx";
import LogOut from "./pages/LogOut.jsx";
import Post from "./pages/Post.jsx";
import LogIn from "./pages/LogIn.jsx";
import PlacePage from "./pages/PlacePage.jsx";
import Layout from "./components/try/Layout.jsx";
import App3 from "./components/try/App3.jsx";
import Home2 from "./pages/Home2.jsx";
import NewMypage from "./components/NewMypage/NewMypage.jsx";
import Abc from "./pages/abc.jsx";
import B from "./pages/B.jsx";
import C from "./pages/C.jsx";
import D from "./pages/D.jsx";
import E from "./pages/E.jsx";
import F from "./pages/F.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/abc" element={<Abc />} />
        <Route path="/b" element={<B />} />
        <Route path="/places/:id" element={<C />} />
        <Route path="/d/:id" element={<D />} />
        <Route path="/e" element={<E />} />
        <Route path="/f" element={<F />} />
        <Route path="/app" element={<App />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home2" element={<Home2 />} />
        <Route path="/place-page" element={<PlacePage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/new-mypage" element={<NewMypage />} />
        <Route path="/" element={<PlacesIndex />} />
        <Route path="/sign-up" element={<SinUp />} />
        <Route path="/log-in" element={<LogIn />} />
        <Route path="/log-out" element={<LogOut />} />
        <Route path="/places/new" element={<PlaceNew />} />
        <Route path="/post" element={<Post />} />
        <Route path="/app3" element={<App3 />} />
        <Route path="/layout" element={<Layout />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
