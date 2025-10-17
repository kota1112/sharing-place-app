import { setToken } from "../lib/api";
import {Link} from "react-router-dom";



export default function LogIn(){
  async function onSubmit(e){
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch(import.meta.env.VITE_API_BASE + "/auth/sign_in", {
      method: "POST",
      body: new URLSearchParams({
        "user[email]": fd.get("email"),
        "user[password]": fd.get("password"),
      })
    });
    const auth = res.headers.get("Authorization");
    if(!res.ok || !auth){ alert("Login failed"); return; }
    setToken(auth.replace("Bearer ",""));
    location.href = "/";
  }
  return (
    <>
    <form onSubmit={onSubmit} className="max-w-sm mx-auto p-6 space-y-3">
      <input name="email" className="border p-2 w-full" placeholder="Email"/>
      <input name="password" type="password" className="border p-2 w-full" placeholder="Password"/>
      <button className="bg-black text-white px-4 py-2 w-full">Sign in</button>
    </form>
    <div>---------</div>
    <Link to={"/sign-up"}>Sign Up</Link>
    </>
  );
}
