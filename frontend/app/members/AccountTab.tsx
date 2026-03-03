"use client";

import { useState } from "react";

type Props = {
  initialUsername: string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  memberTag?: string | null;
  loggedOut?: boolean;
};

function toUsername(memberTag: string | null | undefined) {
  if (!memberTag) return "";
  return memberTag.replace(/^@/, "");
}

export default function AccountTab({ initialUsername }: Props) {
  const [username, setUsername] = useState(initialUsername);
  const [usernamePassword, setUsernamePassword] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [usernameErr, setUsernameErr] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelConfirmation, setCancelConfirmation] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function submit(actionBody: Record<string, unknown>) {
    const res = await fetch("/api/members/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionBody),
    });

    const data = (await res.json().catch(() => null)) as ApiResponse | null;
    if (!res.ok) {
      throw new Error(data?.error || "Unable to update account");
    }
    return data ?? {};
  }

  async function onUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameBusy(true);
    setUsernameErr(null);
    setUsernameMsg(null);
    try {
      const data = await submit({
        action: "update_username",
        username,
        currentPassword: usernamePassword,
      });
      setUsername(toUsername(data.memberTag));
      setUsernamePassword("");
      setUsernameMsg("Username updated.");
    } catch (err) {
      setUsernameErr(err instanceof Error ? err.message : "Unable to update username");
    } finally {
      setUsernameBusy(false);
    }
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordErr(null);
    setPasswordMsg(null);
    try {
      const data = await submit({
        action: "update_password",
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordMsg(data.message ?? "Password changed.");
      window.location.href = "/members/login";
    } catch (err) {
      setPasswordErr(err instanceof Error ? err.message : "Unable to change password");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function onCancelMembership() {
    setCancelBusy(true);
    setCancelErr(null);
    try {
      await submit({
        action: "cancel_membership",
        currentPassword: cancelPassword,
        confirmation: cancelConfirmation,
      });
      window.location.href = "/members/login";
    } catch (err) {
      setCancelErr(err instanceof Error ? err.message : "Unable to cancel membership");
    } finally {
      setCancelBusy(false);
    }
  }

  async function onDeleteAccount() {
    setDeleteBusy(true);
    setDeleteErr(null);
    try {
      await submit({
        action: "delete_account",
        currentPassword: deletePassword,
        confirmation: deleteConfirmation,
      });
      window.location.href = "/members/login";
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Unable to delete account");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border p-4">
        <h3 className="text-lg font-bold">Username</h3>
        <p className="mt-1 text-sm opacity-80">Set the username used for sign-in.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onUsernameSubmit}>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Username</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">@</span>
              <input
                className="w-full rounded-md border border-[#d1d5db] py-2 pl-7 pr-3"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                      .replace(/@/g, "")
                      .replace(/\s+/g, "")
                      .replace(/[^a-zA-Z0-9_]/g, "")
                  )
                }
                required
                minLength={3}
                maxLength={24}
                autoComplete="username"
              />
            </div>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold">Current password</span>
            <input
              type="password"
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
              value={usernamePassword}
              onChange={(e) => setUsernamePassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={usernameBusy}>
              {usernameBusy ? "Saving..." : "Save username"}
            </button>
            {usernameMsg ? <span className="text-sm text-green-700">{usernameMsg}</span> : null}
            {usernameErr ? <span className="text-sm text-red-600">{usernameErr}</span> : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="text-lg font-bold">Password</h3>
        <p className="mt-1 text-sm opacity-80">Change password for your account.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={onPasswordSubmit}>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Current password</span>
            <input
              type="password"
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">New password</span>
            <input
              type="password"
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Confirm new password</span>
            <input
              type="password"
              className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={passwordBusy}>
              {passwordBusy ? "Updating..." : "Change password"}
            </button>
            {passwordMsg ? <span className="text-sm text-green-700">{passwordMsg}</span> : null}
            {passwordErr ? <span className="text-sm text-red-600">{passwordErr}</span> : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-red-200 p-4">
        <h3 className="text-lg font-bold text-red-700">Danger zone</h3>
        <p className="mt-1 text-sm opacity-80">These actions are immediate.</p>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-red-200 p-3">
            <div className="font-semibold">Cancel membership</div>
            <p className="mt-1 text-sm opacity-80">Type CANCEL and enter your password to cancel.</p>

            <div className="mt-3 space-y-2">
              <input
                type="password"
                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                value={cancelPassword}
                onChange={(e) => setCancelPassword(e.target.value)}
                placeholder="Current password"
              />
              <input
                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                value={cancelConfirmation}
                onChange={(e) => setCancelConfirmation(e.target.value)}
                placeholder='Type "CANCEL"'
              />
              <button
                type="button"
                className="btn-outline"
                disabled={cancelBusy || cancelConfirmation !== "CANCEL" || !cancelPassword}
                onClick={onCancelMembership}
              >
                {cancelBusy ? "Cancelling..." : "Cancel membership"}
              </button>
              {cancelErr ? <div className="text-sm text-red-600">{cancelErr}</div> : null}
            </div>
          </div>

          <div className="rounded-lg border border-red-300 p-3">
            <div className="font-semibold text-red-700">Delete account</div>
            <p className="mt-1 text-sm opacity-80">Type DELETE and enter your password to permanently delete your account.</p>

            <div className="mt-3 space-y-2">
              <input
                type="password"
                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Current password"
              />
              <input
                className="w-full rounded-md border border-[#d1d5db] px-3 py-2 text-sm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder='Type "DELETE"'
              />
              <button
                type="button"
                className="btn-primary bg-red-700 hover:bg-red-800"
                disabled={deleteBusy || deleteConfirmation !== "DELETE" || !deletePassword}
                onClick={onDeleteAccount}
              >
                {deleteBusy ? "Deleting..." : "Delete account"}
              </button>
              {deleteErr ? <div className="text-sm text-red-600">{deleteErr}</div> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
