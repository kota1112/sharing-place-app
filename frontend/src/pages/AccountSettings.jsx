// src/pages/AccountSettings.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMe,
  updateAccount,
  requestPasswordReset,
  requestGooglePasswordReset,
} from "../lib/api";
import AccountConnections from "./AccountConnections";

export default function AccountSettings() {
  const [me, setMe] = useState(null);

  // 表示用
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  // 編集モード用
  const [editEmail, setEditEmail] = useState("");
  const [editEmailConfirm, setEditEmailConfirm] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");

  // パスワード変更モード
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConf, setNewPasswordConf] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);

  // 「Forgot password?」を押したときにだけ開くボックス
  const [showForgotBox, setShowForgotBox] = useState(false);

  // mode: "view" | "editProfile" | "changePassword"
  const [mode, setMode] = useState("view");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pwSending, setPwSending] = useState(false);

  // 初回に現在のユーザー情報を拾う
  const fetchMe = async () => {
    const d = await getMe();
    const u = d.user || d;
    setMe(u);
    setEmail(u.email || "");
    setDisplayName(u.display_name || "");
    setUsername(u.username || "");
  };

  useEffect(() => {
    fetchMe().catch((e) => {
      console.warn(e);
      setErr("現在のアカウント情報を取得できませんでした。");
    });
  }, []);

  const handleOpenEditProfile = () => {
    setMsg("");
    setErr("");
    setEditEmail(email);
    setEditEmailConfirm(email);
    setEditDisplayName(displayName);
    setEditUsername(username);
    setMode("editProfile");
  };

  const handleOpenChangePassword = () => {
    setMsg("");
    setErr("");
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConf("");
    setShowNewPw(false);
    setShowForgotBox(false);
    setMode("changePassword");
  };

  const backToView = () => {
    setMode("view");
    setShowForgotBox(false);
  };

  // プロフィール保存
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (saving) return;
    setMsg("");
    setErr("");

    if (editEmail.trim() !== editEmailConfirm.trim()) {
      setErr("メールアドレス（確認）が一致しません。");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        email: editEmail.trim(),
        display_name: editDisplayName,
        username: editUsername,
      };
      const res = await updateAccount(payload);
      const u = res.user || {};
      setMe(u);
      setEmail(u.email || editEmail.trim());
      setDisplayName(u.display_name ?? editDisplayName);
      setUsername(u.username ?? editUsername);
      setMsg("アカウントを更新しました。");
      setMode("view");
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setSaving(false);
    }
  };

  // パスワード保存
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (saving) return;
    setMsg("");
    setErr("");

    if (!currentPassword) {
      setErr("現在のパスワードを入力してください。");
      return;
    }
    if (!newPassword) {
      setErr("新しいパスワードを入力してください。");
      return;
    }
    if (newPassword !== newPasswordConf) {
      setErr("新しいパスワード（確認）が一致しません。");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConf,
      };
      const res = await updateAccount(payload);
      const u = res.user || {};
      setMe(u);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConf("");
      setShowNewPw(false);
      setShowForgotBox(false);
      setMsg("パスワードを変更しました。");
      setMode("view");
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setSaving(false);
    }
  };

  // ===== パスワード再発行API（バックエンド実装済み前提） =====
  const googleLinked = Array.isArray(me?.providers)
    ? me.providers.includes("google")
    : false;

  const handleSendNormalReset = async () => {
    if (!email) {
      setErr("メールアドレスが空です。");
      return;
    }
    setErr("");
    setMsg("");
    setPwSending(true);
    try {
      await requestPasswordReset(email);
      setMsg("Password reset email has been sent.");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setPwSending(false);
    }
  };

  const handleSendGoogleReset = async () => {
    if (!email) {
      setErr("メールアドレスが空です。");
      return;
    }
    setErr("");
    setMsg("");
    setPwSending(true);
    try {
      await requestGooglePasswordReset(email);
      setMsg("Reset link has been sent to your Google-linked email.");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setPwSending(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      {/* 上部ナビ */}
      <div className="flex flex-wrap gap-2 mb-2">
        <Link
          to="/mypage"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          My Page
        </Link>
        <Link
          to="/place-homepage"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Home
        </Link>
        <Link
          to="/account/connections"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Account connections
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Account settings</h1>

      {me && (
        <p className="text-sm text-gray-500">
          Logged in as <span className="font-mono">{me.email}</span>
        </p>
      )}

      {err && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 whitespace-pre-line">
          {msg}
        </div>
      )}

      {/* ===== 閲覧モード ===== */}
      {mode === "view" && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-md border px-3 py-3 bg-white">
            <div>
              <span className="text-xs text-gray-500">Email</span>
              <div className="text-sm font-mono">{email || "—"}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Display name</span>
              <div className="text-sm">{displayName || "—"}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Username</span>
              <div className="text-sm">{username || "—"}</div>
            </div>
          </div>

          {/* Google連携の状態をここで見せる。実操作は専用ページへ */}
          <section className="space-y-2 border-t pt-4">
            <h2 className="text-sm font-semibold">External accounts</h2>
            <AccountConnections embedded />
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm"
            >
              Edit account
            </button>
            <button
              type="button"
              onClick={handleOpenChangePassword}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Change password
            </button>
          </div>
        </div>
      )}

      {/* ===== プロフィール編集モード ===== */}
      {mode === "editProfile" && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <p className="text-sm text-gray-500">
            Update your account information. Email must be confirmed below.
          </p>

          <label htmlFor="edit-email" className="block text-sm font-medium">
            New email
          </label>
          <input
            id="edit-email"
            type="email"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />

          <label
            htmlFor="edit-email-confirm"
            className="block text-sm font-medium"
          >
            New email (confirm)
          </label>
          <input
            id="edit-email-confirm"
            type="email"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={editEmailConfirm}
            onChange={(e) => setEditEmailConfirm(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            Please enter the same email as above.
          </p>

          <label htmlFor="edit-display-name" className="block text-sm font-medium">
            Display name
          </label>
          <input
            id="edit-display-name"
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
          />

          <label htmlFor="edit-username" className="block text-sm font-medium">
            Username
          </label>
          <input
            id="edit-username"
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              type="button"
              onClick={backToView}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ===== パスワード変更モード ===== */}
      {mode === "changePassword" && (
        <form onSubmit={handleSavePassword} className="space-y-4">
          <p className="text-sm text-gray-500">
            Change your password. You must enter the current password first.
          </p>

          <label htmlFor="current-password" className="block text-sm">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {/* New password + show/hide */}
          <div className="block text-sm">
            <div className="flex items-center justify-between">
              <label htmlFor="new-password">New password</label>
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                aria-pressed={showNewPw}
                className={
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs " +
                  (showNewPw ? "bg-gray-100" : "bg-white hover:bg-gray-50")
                }
              >
                {showNewPw ? "Hide" : "Show"}
                <span aria-hidden="true">{showNewPw ? "👁‍🗨" : "👁"}</span>
              </button>
            </div>
            <input
              id="new-password"
              type={showNewPw ? "text" : "password"}
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>

          <label htmlFor="new-password-conf" className="block text-sm">
            Confirm new password
          </label>
          <input
            id="new-password-conf"
            type={showNewPw ? "text" : "password"}
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={newPasswordConf}
            onChange={(e) => setNewPasswordConf(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            required
          />

          {/* Forgot password? （クリックしたときだけ開く） */}
          <div>
            <button
              type="button"
              onClick={() => setShowForgotBox((v) => !v)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showForgotBox ? "Close reset options" : "Forgot password?"}
            </button>

            {showForgotBox && (
              <div className="mt-2 rounded-md bg-gray-50 border px-3 py-3 space-y-2">
                <p className="text-xs text-gray-600">
                  Choose how to send the reset email.
                </p>
                <button
                  type="button"
                  onClick={handleSendNormalReset}
                  disabled={pwSending}
                  className="w-full rounded-md bg-white border px-3 py-2 text-sm text-left disabled:opacity-60"
                >
                  Send normal reset email
                </button>
                <button
                  type="button"
                  onClick={handleSendGoogleReset}
                  disabled={pwSending}
                  className="w-full rounded-md bg-white border px-3 py-2 text-sm text-left disabled:opacity-60"
                >
                  Send reset to Google-linked email
                </button>
                {!googleLinked && (
                  <p className="text-[10px] text-amber-700">
                    * This account is not linked with Google. Link it first in
                    “Account connections”.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "Updating..." : "Update password"}
            </button>
            <button
              type="button"
              onClick={backToView}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
