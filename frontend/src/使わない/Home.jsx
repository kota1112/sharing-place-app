import React from "react";
// import Footer from "../components/footer/Footer";
// import Header from "../components/header/Header";
// import MainBody from "../components/main_body/MainBody";
// import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import NewMainBody from "../components/NewMainBody/NewMainBody";
import NweFooter from "../components/NewFooter/NewFooter";

function Home() {
  return (
    <>
      <div>
        <Navbar />
        <NewMainBody />
        <NweFooter />
        <div>---------</div>
        <div>---------</div>
        {/* <MainBody />
        <div>---------</div>
        <div>---------</div>
        <Footer />
        <div>---------</div>
        <Link to={"/post"}>Post</Link>
        <br />
        <Link to={"/mypage"}>Mypage</Link>
        <br />
        <Link to={"/sign-up"}>Sin Up</Link>
        <br />
        <Link to={"/tryO"}>TryO</Link>
        <br />
        <Link to={"/app"}>App</Link>
        <Link to={"/mypage"} className="text-blue-600">
          Mypage
        </Link> */}
      </div>
    </>
  );
}

export default Home;
