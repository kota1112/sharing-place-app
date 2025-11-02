// src/components/GoogleSignInButton.jsx
import { useEffect, useRef } from "react";
import { setToken, googleLogin } from "../lib/api";

export default function GoogleSignInButton({ onSuccess }) {
  const btnRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    // GIS がまだ来てない / env がない / ボタンDOMがないなら何もしない
    const g = window.google?.accounts?.id;
    if (!g || !clientId || !btnRef.current) return;

    const handleCredential = async (resp) => {
      if (!resp?.credential) return;
      try {
        // サーバーへ id_token を渡してログイン/サインアップ
        const { data, auth } = await googleLogin(resp.credential);

        // Authorization: Bearer ... が返る想定なのでトークンにセット
        if (auth) {
          setToken(auth.replace(/^Bearer\s+/i, ""));
        }

        // 親コンポーネントに「成功したよ」を伝える
        onSuccess?.(data?.user || data);
      } catch (e) {
        // eslint-disable-next-line no-alert
        alert(
          "Googleログインに失敗しました: " + (e?.message || String(e || ""))
        );
      }
    };

    // 初期化
    g.initialize({
      client_id: clientId,
      callback: handleCredential,
      ux_mode: "popup",
      auto_select: false,
      context: "use",
    });

    // ボタンを描画
    g.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "left",
      width: 280,
    });

    // クリーンアップ（StrictMode 二重実行対策）
    return () => {
      try {
        g.cancel?.();
        g.disableAutoSelect?.();
      } catch {
        // noop
      }
    };
  }, [clientId, onSuccess]); // ← ここを入れておくと eslint の warning が消える

  return <div ref={btnRef} />;
}
