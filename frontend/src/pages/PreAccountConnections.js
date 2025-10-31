// src/pages/AccountConnections.jsx
import { useEffect, useRef, useState } from "react";
import { getMe, linkGoogle, unlinkGoogle } from "../lib/api"; // さっきの api.js

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function AccountConnections() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingUnlink, setLoadingUnlink] = useState(false);

  const gsiBtnRef = useRef(null);
  const [gsiReady, setGsiReady] = useState(false);

  // 初回にユーザー取得（/auth/me）
  useEffect(() => {
    (async () => {
      try {
        const d = await getMe();
        setMe(d.user || d);
      } catch (e) {
        console.warn(e);
        setError("アカウント情報を取得できませんでした");
      }
    })();
  }, []);

  // Googleの公式ボタンを用意しておく（「連携する」側）
  useEffect(() => {
    const g = window.google?.accounts?.id;
    if (!g || !GOOGLE_CLIENT_ID || !gsiBtnRef.current) return;

    // Googleが返すcredentialを→バックエンドにPOSTする
    const onCredential = async (resp) => {
      if (!resp?.credential) return;
      setError("");
      setInfo("");
      setLoadingLink(true);
      try {
        await linkGoogle(resp.credential);
        setInfo("Googleアカウントを連携しました。");
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoadingLink(false);
      }
    };

    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: onCredential,
      auto_select: false,
      ux_mode: "popup",
      context: "use",
    });

    g.renderButton(gsiBtnRef.current, {
      theme: "outline",
      size: "large",
      width: "100%",
      text: "continue_with",
      shape: "rectangular",
    });

    setGsiReady(true);

    return () => {
      try { g.cancel(); } catch {}
    };
  }, []);

  // Google連携を解除
  async function onUnlinkGoogle() {
    setError("");
    setInfo("");
    setLoadingUnlink(true);
    try {
      await unlinkGoogle();
      setInfo("Googleアカウントの連携を解除しました。");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoadingUnlink(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Account connections</h1>

      {me && (
        <p className="text-sm text-gray-600">
          Logged in as <span className="font-mono">{me.email}</span>
        </p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-700 whitespace-pre-line">
          {error}
        </div>
      )}

      {info && (
        <div className="rounded-md bg-green-50 border border-green-200 p-2 text-sm text-green-700 whitespace-pre-line">
          {info}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Googleを連携する</h2>
        <p className="text-xs text-gray-500">
          Googleでログインした後も、メール/パスワードのログインは使えます。
        </p>

        {/* Google公式ボタン */}
        <div ref={gsiBtnRef} />

        {!gsiReady && (
          <button
            type="button"
            disabled
            className="w-full rounded-md border px-4 py-2 text-sm disabled:opacity-50"
          >
            {loadingLink ? "連携中..." : "Googleと連携する"}
          </button>
        )}
      </section>

      <section className="space-y-2 pt-4 border-t">
        <h2 className="font-semibold">Google連携を解除する</h2>
        <p className="text-xs text-gray-500">
          解除してもユーザー自体は残ります。メール/パスワードでログインできます。
        </p>
        <button
          type="button"
          onClick={onUnlinkGoogle}
          disabled={loadingUnlink}
          className="rounded-md bg-red-500 text-white px-4 py-2 text-sm disabled:opacity-60"
        >
          {loadingUnlink ? "解除中..." : "Google連携を解除"}
        </button>
      </section>
    </main>
  );
}
