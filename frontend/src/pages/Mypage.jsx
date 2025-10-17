import React from 'react'
import Home from './Home'
import {Link} from "react-router-dom";

function MyPage() {
  return (
    <>
    <div>MyPage</div>
    <div>---------</div>
    <Link to={"/home"}>Home</Link>
    <br/>
    <Link to={"/post"}>Post</Link>
    <br/>
    <Link to={"/app"}>App</Link>
    </>
  )
}

export default MyPage