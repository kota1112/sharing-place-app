// src/pages/OAuthCallback.jsx
import { useEffect } from "react";
import { setToken } from "../lib/api";

export default function OAuthCallback() {
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const token = p.get("token");
    if (token) {
      setToken(token);
      const redirect = p.get("redirect") || "/";
      location.replace(redirect);
    } else {
      location.replace("/login?error=oauth");
    }
  }, []);
  return <p className="p-6 text-center">Signing you in…</p>;
}
