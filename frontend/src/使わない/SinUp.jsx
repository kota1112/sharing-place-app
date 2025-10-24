import React from 'react'
import LogIn from './LogIn'
import {Link} from "react-router-dom";


function SinUp() {
  return (
    <>
    <div>SinUp</div>
    <div>---------</div>
    <Link to={"/log-in"}>Log In</Link>
    </>
  )
}

export default SinUp