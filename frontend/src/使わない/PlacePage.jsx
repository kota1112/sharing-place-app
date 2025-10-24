import React from 'react'
import {Link} from "react-router-dom";
import Home from './Home';

function PlacePage() {
  return (
    <>
    <div>PlacePage</div>
    <div>---------</div>
    <Link to={"/home"}>Home</Link>
    </>
  )
}

export default PlacePage