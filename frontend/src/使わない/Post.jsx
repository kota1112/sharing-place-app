import React from 'react'
import {Link} from "react-router-dom";

function Post() {
  return (
    <>
        <div>Post</div>
        <div>---------</div>
        <Link to={"/home"}>Home</Link>
        <br/>
        <Link to={"/mypage"}>Mypage</Link>
        <br/>
        <Link to={"/app"}>App</Link>
    </>
  )
}



export default Post