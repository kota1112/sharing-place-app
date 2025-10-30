// 例: src/pages/Account.jsx の断片
import { useRef, useState, useEffect } from "react";
import { linkGoogle, unlinkGoogle } from "../lib/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function AccountLinks({ me }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const gsiBtnRef = useRef(null);

  // Google に未連携なら、GISボタンで linkGoogle を呼ぶ
  useEffect(() => {
    if (!gsiBtnRef.current || !GOOGLE_CLIENT_ID) return;
    const g = window.google?.accounts?.id;
    if (!g) return;

    const onCredential = async (resp) => {
      if (!resp?.credential) return;
      setBusy(true);
      setMsg("");
      try {
        await linkGoogle(resp.credential);
        setMsg("Google account linked.");
        // me 再取得など
      } catch (e) {
        setMsg(e.message || "Link failed");
      } finally {
        setBusy(false);
      }
    };

    g.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential, ux_mode: "popup" });
    g.renderButton(gsiBtnRef.current, { theme: "outline", size: "medium", text: "continue_with" });
  }, []);

  const handleUnlink = async () => {
    if (!confirm("Unlink Google account? You will need another sign-in method.")) return;
    setBusy(true);
    setMsg("");
    try {
      await unlinkGoogle();
      setMsg("Google account unlinked.");
    } catch (e) {
      setMsg(e.message || "Unlink failed");
    } finally {
      setBusy(false);
    }
  };

  const isLinked = me?.providers?.includes("google");

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">External accounts</h2>

      {isLinked ? (
        <button onClick={handleUnlink} disabled={busy} className="border px-3 py-1 rounded">
          Unlink Google
        </button>
      ) : (
        <div ref={gsiBtnRef} />
      )}

      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  );
}
