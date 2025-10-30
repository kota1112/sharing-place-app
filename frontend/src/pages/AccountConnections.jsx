// src/pages/AccountConnections.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMe, linkGoogle, unlinkGoogle } from "../lib/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * embedded = true のときは
 * - タイトル/ナビを出さない
 * - 外枠の <main> の余白を小さくする
 * という「埋め込みモード」で描画する
 */
export default function AccountConnections({ embedded = false }) {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingUnlink, setLoadingUnlink] = useState(false);

  const gsiBtnRef = useRef(null);
  const [gsiReady, setGsiReady] = useState(false);

  const isLinked = !!me?.providers?.includes("google");

  const fetchMe = async () => {
    const d = await getMe();
    setMe(d.user || d);
  };

  // 初回にユーザー取得
  useEffect(() => {
    fetchMe().catch((e) => {
      console.warn(e);
      setError("アカウント情報を取得できませんでした");
    });
  }, []);

  // Googleボタン描画（未連携のときだけ）
  useEffect(() => {
    if (isLinked) return;

    const g = window.google?.accounts?.id;
    if (!g || !GOOGLE_CLIENT_ID || !gsiBtnRef.current) return;

    const onCredential = async (resp) => {
      if (!resp?.credential) return;
      setError("");
      setInfo("");
      setLoadingLink(true);
      try {
        await linkGoogle(resp.credential);
        await fetchMe();
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
      try {
        g.cancel();
      } catch {}
    };
  }, [isLinked]);

  // Google連携を解除
  async function onUnlinkGoogle() {
    setError("");
    setInfo("");
    setLoadingUnlink(true);
    try {
      await unlinkGoogle();
      await fetchMe();
      setInfo("Googleアカウントの連携を解除しました。");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoadingUnlink(false);
    }
  }

  // ここからUI
  return (
    <main
      className={
        embedded
          ? "space-y-4" // 埋め込み用に余白小さめ
          : "max-w-md mx-auto p-6 space-y-4"
      }
    >
      {/* 埋め込みじゃないときだけ上のナビとタイトル */}
      {!embedded && (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            <Link
              to="/place-homepage"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Home
            </Link>
            <Link
              to="/mypage"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              My Page
            </Link>
            <Link
              to="/account/settings"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Account settings
            </Link>
          </div>

          <h1 className="text-2xl font-bold">Account connections</h1>
        </>
      )}

      {me && !embedded && (
        <p className="text-sm text-gray-600">
          Logged in as <span className="font-mono">{me.email}</span>
        </p>
      )}

      {/* ステータス表示 */}
      {isLinked ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
          現在、このアカウントは <strong>Google アカウントと連携されています。</strong>
        </div>
      ) : (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          現在、このアカウントは <strong>Google アカウントと連携されていません。</strong>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-700 whitespace-pre-line">
          {error}
        </div>
      )}

      {info && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-2 text-sm text-blue-700 whitespace-pre-line">
          {info}
        </div>
      )}

      {/* 連携していないときだけ「Googleを連携する」 */}
      {!isLinked && (
        <section className="space-y-2">
          {!embedded && <h2 className="font-semibold">Googleを連携する</h2>}
          <p className="text-xs text-gray-500">
            Googleでログインした後も、メール/パスワードのログインは使えます。
          </p>

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
      )}

      {/* 連携しているときだけ「解除する」 */}
      {isLinked && (
        <section className="space-y-2 pt-4 border-t">
          {!embedded && <h2 className="font-semibold">Google連携を解除する</h2>}
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
      )}
    </main>
  );
}
